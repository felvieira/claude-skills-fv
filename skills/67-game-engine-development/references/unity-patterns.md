# Unity — Padroes de Desenvolvimento

Codigo portado de `Jeffallan/claude-skills` (MIT) — ver `## Fontes` no `SKILL.md` principal.

## MonoBehaviour — Boas Praticas

Cachear componente em `Awake`, nunca em `Update`. Usar `FixedUpdate` pra fisica, `Update` pra
input/logica. Limpar coroutine em `OnDisable`.

```csharp
using UnityEngine;
using System.Collections.Generic;

public class EnemyController : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private Transform target;

    private Rigidbody rb;
    private Animator animator;

    private void Awake()
    {
        // Cachear componentes em Awake — nunca chamar GetComponent em Update
        rb = GetComponent<Rigidbody>();
        animator = GetComponent<Animator>();
    }

    private void Start()
    {
        // Inicializar depois que todo Awake ja rodou
        if (target == null)
            target = GameObject.FindGameObjectWithTag("Player").transform;
    }

    private void FixedUpdate()
    {
        // Calculo de fisica vai em FixedUpdate
        Vector3 direction = (target.position - transform.position).normalized;
        rb.MovePosition(transform.position + direction * moveSpeed * Time.fixedDeltaTime);
    }

    private void OnDisable()
    {
        StopAllCoroutines();
    }
}
```

## ScriptableObject pra Dado

Separar dado de configuracao (arma, item, inimigo) da logica de execucao. Um `WeaponData` pode conter
metodo, mas o proposito e ser um container de dado editavel no Inspector sem precisar de instancia de
cena.

```csharp
[CreateAssetMenu(fileName = "WeaponData", menuName = "Game/Weapon")]
public class WeaponData : ScriptableObject
{
    public string weaponName;
    public int damage;
    public float fireRate;
    public GameObject projectilePrefab;
    public AudioClip fireSound;

    public float GetDamageMultiplier(float distance)
    {
        return Mathf.Max(0.5f, 1f - (distance / 100f));
    }
}

public class Weapon : MonoBehaviour
{
    [SerializeField] private WeaponData weaponData;
    private float nextFireTime;

    public void Fire()
    {
        if (Time.time < nextFireTime) return;

        Instantiate(weaponData.projectilePrefab, transform.position, transform.rotation);
        nextFireTime = Time.time + 1f / weaponData.fireRate;
    }
}
```

## Object Pooling

Pre-instanciar objetos e reciclar em vez de Instantiate/Destroy repetido — evita pico de garbage
collection em jogo com spawn frequente (bala, particula, inimigo).

```csharp
public class ObjectPool : MonoBehaviour
{
    [SerializeField] private GameObject prefab;
    [SerializeField] private int poolSize = 20;

    private Queue<GameObject> pool = new Queue<GameObject>();

    private void Start()
    {
        for (int i = 0; i < poolSize; i++)
        {
            GameObject obj = Instantiate(prefab);
            obj.SetActive(false);
            pool.Enqueue(obj);
        }
    }

    public GameObject Get()
    {
        if (pool.Count > 0)
        {
            GameObject obj = pool.Dequeue();
            obj.SetActive(true);
            return obj;
        }

        // Pool esgotado — expandir sob demanda
        return Instantiate(prefab);
    }

    public void Return(GameObject obj)
    {
        obj.SetActive(false);
        pool.Enqueue(obj);
    }
}

public class Bullet : MonoBehaviour
{
    private ObjectPool pool;

    public void Initialize(ObjectPool pool) => this.pool = pool;

    private void OnCollisionEnter(Collision collision)
    {
        // Devolver ao pool em vez de destruir
        pool.Return(gameObject);
    }
}
```

## Sistema de Evento

`UnityEvent` para o que precisa aparecer no Inspector; `event Action` em classe estatica para
performance (sem overhead de serializacao).

```csharp
using System;
using UnityEngine.Events;

[Serializable]
public class HealthChangedEvent : UnityEvent<int, int> { } // atual, maximo

public class Health : MonoBehaviour
{
    [SerializeField] private int maxHealth = 100;
    private int currentHealth;

    public HealthChangedEvent onHealthChanged;
    public UnityEvent onDeath;

    private void Start()
    {
        currentHealth = maxHealth;
        onHealthChanged?.Invoke(currentHealth, maxHealth);
    }

    public void TakeDamage(int damage)
    {
        currentHealth = Mathf.Max(0, currentHealth - damage);
        onHealthChanged?.Invoke(currentHealth, maxHealth);

        if (currentHealth <= 0)
            onDeath?.Invoke();
    }
}

// Alternativa de C# event pra performance (sem overhead de UnityEvent)
public static class GameEvents
{
    public static event Action<int> OnScoreChanged;
    public static event Action<string> OnGameOver;

    public static void TriggerScoreChanged(int score) => OnScoreChanged?.Invoke(score);
    public static void TriggerGameOver(string reason) => OnGameOver?.Invoke(reason);
}
```

## Coroutine — Boas Praticas

Cachear `WaitForSeconds` (reusar instancia evita alocacao); parar coroutine anterior antes de iniciar
outra do mesmo tipo.

```csharp
using System.Collections;

public class TimedAbility : MonoBehaviour
{
    // Cachear WaitForSeconds evita alocacao de GC a cada chamada
    private WaitForSeconds cooldownWait = new WaitForSeconds(5f);
    private Coroutine currentAbility;

    public void ActivateAbility()
    {
        if (currentAbility != null)
            StopCoroutine(currentAbility);

        currentAbility = StartCoroutine(AbilityCoroutine());
    }

    private IEnumerator AbilityCoroutine()
    {
        Debug.Log("Habilidade ativada");
        yield return cooldownWait;
        Debug.Log("Habilidade pronta");
        currentAbility = null;
    }

    private IEnumerator LerpPosition(Vector3 target, float duration)
    {
        Vector3 start = transform.position;
        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            transform.position = Vector3.Lerp(start, target, t);
            yield return null; // Espera um frame
        }

        transform.position = target; // Garante posicao final exata
    }
}
```

## Singleton — Usar com Moderacao

Padrao util pra `GameManager`, mas facilmente abusado — cada singleton adicionado e um acoplamento
global que dificulta teste. Preferir injecao de dependencia ou service locator (ver
`references/ecs-patterns.md`) quando o projeto crescer.

```csharp
public class GameManager : MonoBehaviour
{
    private static GameManager instance;
    public static GameManager Instance => instance;

    private void Awake()
    {
        if (instance != null && instance != this)
        {
            Destroy(gameObject);
            return;
        }

        instance = this;
        DontDestroyOnLoad(gameObject);
    }
}
```

## Checklist de Performance

- Cachear `GetComponent<T>()` em Awake/Start, nunca em Update
- Usar `CompareTag()` em vez de `tag == "TagName"` (evita alocacao de string)
- Object pooling pra objeto instanciado com frequencia
- Evitar `Camera.main` em Update (faz busca em cena — cachear a referencia)
- `FixedUpdate` pra fisica, `Update` pra input/logica
- Desabilitar componente em vez de GameObject quando possivel (mais barato)
- `StringBuilder` pra concatenacao de string em loop
