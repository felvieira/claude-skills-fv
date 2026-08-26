# Otimizacao de Performance

Codigo portado de `Jeffallan/claude-skills` (MIT) — ver `## Fontes` no `SKILL.md` principal.

## Perfilar Primeiro

Nunca otimizar por intuicao — medir com `Profiler.BeginSample`/`EndSample` (Unity) ou Unreal Insights
antes de decidir onde investir tempo.

```csharp
using UnityEngine.Profiling;

public class PerformanceMonitor : MonoBehaviour
{
    private void Update()
    {
        Profiler.BeginSample("Enemy AI Update");
        UpdateEnemyAI();
        Profiler.EndSample();

        long allocatedMemory = Profiler.GetTotalAllocatedMemoryLong();
        long reservedMemory = Profiler.GetTotalReservedMemoryLong();
        float fps = 1.0f / Time.unscaledDeltaTime;
    }
}
```

## Otimizacao de Memoria

Toda alocacao dentro de `Update` gera garbage que o coletor precisa varrer depois — em jogo com frame
budget de 16ms, uma pausa de GC e visivel como engasgo.

```csharp
// RUIM: aloca garbage todo frame
void Update()
{
    string status = "Health: " + health + " / " + maxHealth; // boxing + alocacao
    Vector3 direction = transform.position - target.position; // alocacao
    var enemies = GameObject.FindGameObjectsWithTag("Enemy"); // alocacao
}

// BOM: zero alocacao
private StringBuilder statusBuilder = new StringBuilder(50);
private Vector3 directionCache;
private List<Enemy> enemyCache = new List<Enemy>(100);

void Update()
{
    statusBuilder.Clear();
    statusBuilder.Append("Health: ").Append(health).Append(" / ").Append(maxHealth);

    directionCache = transform.position - target.position;

    // enemyCache preenchido uma vez em Start, nao recriado todo frame
    foreach (var enemy in enemyCache)
        enemy.UpdateLogic();
}
```

## Batching de Draw Call

Batching estatico serve objeto que nao se move; batching dinamico exige mesmo material, menos de 300
vertice, e escala uniforme (escala nao-uniforme quebra o batching automatico). GPU instancing serve
muitos objetos identicos (grama, projetil, particula).

```csharp
public class StaticBatchHelper : MonoBehaviour
{
    void Start()
    {
        GameObject[] staticObjects = GameObject.FindGameObjectsWithTag("StaticProp");
        StaticBatchingUtility.Combine(staticObjects, gameObject);
    }
}

// Requisitos de batching dinamico:
// - Mesmo material
// - Contagem de vertice < 300
// - Mesma escala (escala nao-uniforme quebra o batching)
// - Sem lightmap

// GPU Instancing (pra muitos objetos identicos):
// Adicionar ao shader: #pragma multi_compile_instancing
// Habilitar "GPU Instancing" no material
// Usar Graphics.DrawMeshInstanced ou Graphics.RenderMeshInstanced
```

## Sistema de LOD (Level of Detail)

Trocar malha por distancia da camera — reduz custo de renderizacao pra objeto distante sem perda
visivel de qualidade.

```csharp
public class LODSetup : MonoBehaviour
{
    void SetupLOD()
    {
        LODGroup lodGroup = gameObject.AddComponent<LODGroup>();

        LOD[] lods = new LOD[3];
        lods[0] = new LOD(0.6f, GetRenderers("LOD0")); // 0%-60% da altura de tela: alta qualidade
        lods[1] = new LOD(0.3f, GetRenderers("LOD1")); // 60%-30%: qualidade media
        lods[2] = new LOD(0.1f, GetRenderers("LOD2")); // 30%-10%: baixa qualidade

        lodGroup.SetLODs(lods);
        lodGroup.RecalculateBounds();
    }

    private Renderer[] GetRenderers(string lodName)
    {
        return transform.Find(lodName).GetComponentsInChildren<Renderer>();
    }
}
```

## Occlusion Culling

Configurar no editor (marcar estatico como Occluder/Occludee, bakear em Window > Rendering >
Occlusion Culling); em runtime, checar frustum manualmente quando precisar de logica condicional
alem do culling automatico.

```csharp
public class OcclusionCheck : MonoBehaviour
{
    private Camera mainCamera;

    void Start() => mainCamera = Camera.main;

    void Update()
    {
        Plane[] planes = GeometryUtility.CalculateFrustumPlanes(mainCamera);
        Bounds bounds = GetComponent<Renderer>().bounds;

        if (GeometryUtility.TestPlanesAABB(planes, bounds))
            UpdateVisibleObject();
    }
}
```

## Pool Otimizado (com Rastreio de Uso)

Versao do pool que rastreia objetos em uso separadamente dos disponiveis — permite `Clear()` seguro e
evita devolver um objeto que ja esta no pool por engano.

```csharp
public class OptimizedPool<T> where T : Component
{
    private readonly Stack<T> available = new Stack<T>();
    private readonly HashSet<T> inUse = new HashSet<T>();
    private readonly T prefab;
    private readonly Transform parent;

    public OptimizedPool(T prefab, int initialSize, Transform parent = null)
    {
        this.prefab = prefab;
        this.parent = parent;

        for (int i = 0; i < initialSize; i++)
        {
            T instance = Object.Instantiate(prefab, parent);
            instance.gameObject.SetActive(false);
            available.Push(instance);
        }
    }

    public T Get()
    {
        T instance = available.Count > 0 ? available.Pop() : Object.Instantiate(prefab, parent);
        instance.gameObject.SetActive(true);
        inUse.Add(instance);
        return instance;
    }

    public void Return(T instance)
    {
        if (inUse.Remove(instance))
        {
            instance.gameObject.SetActive(false);
            available.Push(instance);
        }
    }

    public void Clear()
    {
        foreach (var instance in inUse) Object.Destroy(instance.gameObject);
        foreach (var instance in available) Object.Destroy(instance.gameObject);
        inUse.Clear();
        available.Clear();
    }
}
```

## Otimizacao de Fisica

Layer collision matrix filtra pares de colisao no nivel de fisica (mais barato que checar em codigo);
raycast deve ser limitado por layer mask e por intervalo de tempo, nunca disparado sem controle todo
frame.

```csharp
public class PhysicsOptimization : MonoBehaviour
{
    void Start()
    {
        // Layer collision matrix filtra colisao no nivel de motor de fisica
        // Trigger collider e mais barato que collision solida quando possivel
        // Preferir forma simples: esfera/caixa > capsula > malha

        Rigidbody rb = GetComponent<Rigidbody>();
        rb.sleepThreshold = 0.1f; // Permitir que o corpo "durma" quando parado
        rb.interpolation = RigidbodyInterpolation.None; // So habilitar se realmente necessario
    }

    private RaycastHit hitInfo;
    private float raycastInterval = 0.1f;
    private float nextRaycast;

    void Update()
    {
        if (Time.time >= nextRaycast)
        {
            int layerMask = 1 << LayerMask.NameToLayer("Ground");

            if (Physics.Raycast(transform.position, Vector3.down, out hitInfo, 10f, layerMask))
            {
                // Processar hit
            }

            nextRaycast = Time.time + raycastInterval;
        }
    }
}
```

## Otimizacao de Update

Distribuir custo de update entre frames (staggering) reduz pico de CPU num frame so; ajustar
frequencia de update pela distancia do jogador reduz custo pra entidade fora do foco de atencao.

```csharp
public class StaggeredUpdate : MonoBehaviour
{
    private static int updateOffset = 0;
    private int myOffset;

    void Start() => myOffset = updateOffset++;

    void Update()
    {
        // Atualizar so a cada 5 frames, com offset escalonado por instancia
        if ((Time.frameCount + myOffset) % 5 == 0)
            ExpensiveUpdate();
    }

    void ExpensiveUpdate() { /* IA, pathfinding, etc */ }
}

public class DistanceBasedUpdate : MonoBehaviour
{
    private Transform player;
    private float updateInterval;
    private float nextUpdate;

    void Update()
    {
        if (Time.time < nextUpdate) return;

        float distance = Vector3.Distance(transform.position, player.position);

        if (distance < 10f) updateInterval = 0.05f;       // 20 fps
        else if (distance < 50f) updateInterval = 0.1f;   // 10 fps
        else updateInterval = 0.5f;                        // 2 fps

        PerformUpdate();
        nextUpdate = Time.time + updateInterval;
    }
}
```

## Carregamento Assincrono

Carregar cena/asset em background evita travar o frame principal durante transicao — essencial pra
manter responsividade em qualquer troca de nivel.

```csharp
using UnityEngine.SceneManagement;
using System.Collections;

public class AsyncLoader : MonoBehaviour
{
    public IEnumerator LoadSceneAsync(string sceneName)
    {
        AsyncOperation asyncLoad = SceneManager.LoadSceneAsync(sceneName);
        asyncLoad.allowSceneActivation = false;

        while (!asyncLoad.isDone)
        {
            float progress = Mathf.Clamp01(asyncLoad.progress / 0.9f);

            if (asyncLoad.progress >= 0.9f)
            {
                yield return new WaitForSeconds(1f);
                asyncLoad.allowSceneActivation = true;
            }

            yield return null;
        }
    }

    public IEnumerator LoadAssetAsync<T>(string path) where T : Object
    {
        ResourceRequest request = Resources.LoadAsync<T>(path);
        while (!request.isDone) yield return null;
        T asset = request.asset as T;
        // Usar asset
    }
}
```

## Checklist de Performance

**Alvo: 60 FPS (16.67ms por frame)**

Orcamento de CPU:
- Logica de jogo: 5-7ms
- Renderizacao: 3-5ms
- Fisica: 2-3ms
- Script: 2-3ms

Ordem de prioridade de otimizacao:
1. Perfilar primeiro (Profiler, Frame Debugger)
2. Reduzir draw call (batching, instancing)
3. Otimizar loop de Update caro
4. Object pooling
5. Sistema de LOD
6. Habilitar occlusion culling
7. Otimizar tamanho e compressao de textura
8. Minimizar garbage collection (alocacao)
9. Carregamento assincrono
10. Taxa de update baseada em distancia
