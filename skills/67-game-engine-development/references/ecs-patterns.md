# ECS e Padroes de Design de Jogo

Codigo portado de `Jeffallan/claude-skills` (MIT) — ver `## Fontes` no `SKILL.md` principal. Exemplos
em C# (Unity), mas os padroes se transferem pra qualquer motor com sintaxe equivalente.

## Entity Component System (ECS)

Componente e dado puro (struct, sem logica). Sistema e a logica que opera sobre span/array de
componente. Separar assim habilita processamento em lote e layout amigavel a cache — o oposto do
modelo de heranca de ator do MonoBehaviour tradicional.

```csharp
// Componente = dado puro (sem logica)
public struct PositionComponent
{
    public float X;
    public float Y;
    public float Z;
}

public struct VelocityComponent
{
    public float X;
    public float Y;
    public float Z;
}

public struct HealthComponent
{
    public int Current;
    public int Max;
}

public struct PlayerTag { } // Componente marcador, sem campo

// Entidade = so um ID
public struct Entity
{
    public int Id;
}

// Sistema = logica que opera sobre componente
public class MovementSystem
{
    public void Update(float deltaTime,
        Span<PositionComponent> positions,
        Span<VelocityComponent> velocities)
    {
        for (int i = 0; i < positions.Length; i++)
        {
            positions[i].X += velocities[i].X * deltaTime;
            positions[i].Y += velocities[i].Y * deltaTime;
            positions[i].Z += velocities[i].Z * deltaTime;
        }
    }
}

// Mundo ECS simplificado — ilustra a forma, nao e implementacao de producao
public class World
{
    private int nextEntityId = 0;
    private Dictionary<int, PositionComponent> positions = new();
    private Dictionary<int, VelocityComponent> velocities = new();
    private Dictionary<int, HealthComponent> healths = new();

    public Entity CreateEntity() => new Entity { Id = nextEntityId++ };

    public void AddComponent<T>(Entity entity, T component)
    {
        // Armazenar componente indexado pelo ID da entidade
    }

    public T GetComponent<T>(Entity entity)
    {
        return default;
    }
}
```

## Object Pool Generico

Versao generica do padrao — reutilizavel pra qualquer tipo, com callback de reset explicito e limite
de tamanho pra evitar pool sem controle de crescimento.

```csharp
public class ObjectPool<T> where T : class, new()
{
    private readonly Stack<T> pool = new();
    private readonly Func<T> createFunc;
    private readonly Action<T> resetAction;
    private readonly int maxSize;

    public ObjectPool(Func<T> createFunc, Action<T> resetAction, int initialSize = 10, int maxSize = 100)
    {
        this.createFunc = createFunc;
        this.resetAction = resetAction;
        this.maxSize = maxSize;

        for (int i = 0; i < initialSize; i++)
            pool.Push(createFunc());
    }

    public T Get() => pool.Count > 0 ? pool.Pop() : createFunc();

    public void Return(T obj)
    {
        if (pool.Count < maxSize)
        {
            resetAction?.Invoke(obj);
            pool.Push(obj);
        }
    }
}

public class BulletManager
{
    private ObjectPool<Bullet> bulletPool;

    public void Initialize()
    {
        bulletPool = new ObjectPool<Bullet>(
            createFunc: () => new Bullet(),
            resetAction: (bullet) => bullet.Reset(),
            initialSize: 50,
            maxSize: 200
        );
    }

    public Bullet SpawnBullet()
    {
        Bullet bullet = bulletPool.Get();
        bullet.Activate();
        return bullet;
    }

    public void ReturnBullet(Bullet bullet)
    {
        bullet.Deactivate();
        bulletPool.Return(bullet);
    }
}
```

## State Machine

Interface `IState` com Enter/Update/Exit; a maquina troca de estado chamando Exit no atual antes de
Enter no proximo — garante que limpeza sempre roda antes de inicializacao do novo estado.

```csharp
public interface IState
{
    void Enter();
    void Update(float deltaTime);
    void Exit();
}

public class StateMachine
{
    private IState currentState;

    public void ChangeState(IState newState)
    {
        currentState?.Exit();
        currentState = newState;
        currentState?.Enter();
    }

    public void Update(float deltaTime) => currentState?.Update(deltaTime);
}

// Exemplo: estados de IA de inimigo
public class IdleState : IState
{
    private readonly EnemyController enemy;
    public IdleState(EnemyController enemy) => this.enemy = enemy;

    public void Enter() => enemy.PlayAnimation("Idle");

    public void Update(float deltaTime)
    {
        if (enemy.PlayerInRange())
            enemy.StateMachine.ChangeState(new ChaseState(enemy));
    }

    public void Exit() { }
}

public class ChaseState : IState
{
    private readonly EnemyController enemy;
    public ChaseState(EnemyController enemy) => this.enemy = enemy;

    public void Enter() => enemy.PlayAnimation("Run");

    public void Update(float deltaTime)
    {
        if (!enemy.PlayerInRange())
            enemy.StateMachine.ChangeState(new IdleState(enemy));
        else if (enemy.InAttackRange())
            enemy.StateMachine.ChangeState(new AttackState(enemy));
        else
            enemy.MoveTowardsPlayer(deltaTime);
    }

    public void Exit() { }
}
```

## Command Pattern (Input)

Encapsular acao como objeto com Execute/Undo — habilita historico de comando (util pra replay, undo de
editor, ou rewind de debug).

```csharp
public interface ICommand
{
    void Execute();
    void Undo();
}

public class MoveCommand : ICommand
{
    private readonly Transform transform;
    private readonly Vector3 movement;
    private Vector3 previousPosition;

    public MoveCommand(Transform transform, Vector3 movement)
    {
        this.transform = transform;
        this.movement = movement;
    }

    public void Execute()
    {
        previousPosition = transform.position;
        transform.position += movement;
    }

    public void Undo()
    {
        transform.position = previousPosition;
    }
}

public class InputHandler
{
    private Stack<ICommand> commandHistory = new();

    public void ExecuteCommand(ICommand command)
    {
        command.Execute();
        commandHistory.Push(command);
    }

    public void UndoLastCommand()
    {
        if (commandHistory.Count > 0)
            commandHistory.Pop().Undo();
    }
}
```

## Observer Pattern (Evento)

Wrapper generico sobre `event Action<T>` — hub central de eventos de jogo desacopla publisher de
subscriber sem referencia direta entre eles.

```csharp
public class GameEvent<T>
{
    private event Action<T> listeners;

    public void Subscribe(Action<T> listener) => listeners += listener;
    public void Unsubscribe(Action<T> listener) => listeners -= listener;
    public void Trigger(T data) => listeners?.Invoke(data);
}

public static class GameEvents
{
    public static readonly GameEvent<int> OnScoreChanged = new();
    public static readonly GameEvent<float> OnHealthChanged = new();
    public static readonly GameEvent<string> OnGameOver = new();
}

public class UIController
{
    private void OnEnable()
    {
        GameEvents.OnScoreChanged.Subscribe(UpdateScoreDisplay);
        GameEvents.OnHealthChanged.Subscribe(UpdateHealthBar);
    }

    private void OnDisable()
    {
        GameEvents.OnScoreChanged.Unsubscribe(UpdateScoreDisplay);
        GameEvents.OnHealthChanged.Unsubscribe(UpdateHealthBar);
    }

    private void UpdateScoreDisplay(int score) { /* atualizar UI */ }
    private void UpdateHealthBar(float health) { /* atualizar UI */ }
}
```

## Service Locator

Registro centralizado de servico por tipo — alternativa ao singleton multiplo quando varios sistemas
globais precisam coexistir sem virar uma cadeia de `Instance.Instance.Instance`.

```csharp
public static class ServiceLocator
{
    private static Dictionary<Type, object> services = new();

    public static void Register<T>(T service) => services[typeof(T)] = service;

    public static T Get<T>()
    {
        if (services.TryGetValue(typeof(T), out object service))
            return (T)service;

        throw new Exception($"Service {typeof(T)} not found");
    }

    public static bool TryGet<T>(out T service)
    {
        if (services.TryGetValue(typeof(T), out object obj))
        {
            service = (T)obj;
            return true;
        }

        service = default;
        return false;
    }

    public static void Clear() => services.Clear();
}
```

## Spatial Partitioning (Grid)

Particionar espaco em celulas pra consulta de proximidade O(1) amortizado em vez de varrer todas as
entidades — essencial pra deteccao de colisao ou IA com muitos agentes.

```csharp
public class SpatialGrid<T>
{
    private readonly Dictionary<(int, int), List<T>> grid = new();
    private readonly float cellSize;

    public SpatialGrid(float cellSize) => this.cellSize = cellSize;

    private (int, int) GetCell(Vector2 position)
    {
        int x = Mathf.FloorToInt(position.x / cellSize);
        int y = Mathf.FloorToInt(position.y / cellSize);
        return (x, y);
    }

    public void Insert(Vector2 position, T item)
    {
        var cell = GetCell(position);
        if (!grid.ContainsKey(cell))
            grid[cell] = new List<T>();

        grid[cell].Add(item);
    }

    public List<T> Query(Vector2 position, float radius)
    {
        List<T> results = new();
        int cellRadius = Mathf.CeilToInt(radius / cellSize);
        var centerCell = GetCell(position);

        for (int x = -cellRadius; x <= cellRadius; x++)
            for (int y = -cellRadius; y <= cellRadius; y++)
            {
                var cell = (centerCell.Item1 + x, centerCell.Item2 + y);
                if (grid.TryGetValue(cell, out List<T> items))
                    results.AddRange(items);
            }

        return results;
    }

    public void Clear() => grid.Clear();
}
```

## Double Buffer (Renderizacao/Fisica)

Ler do buffer atual, escrever no proximo, trocar no fim do passo — evita estado inconsistente quando
leitura e escrita do mesmo dado acontecem no mesmo update.

```csharp
public class DoubleBuffer<T>
{
    private T[] buffers = new T[2];
    private int currentIndex = 0;

    public DoubleBuffer(T buffer1, T buffer2)
    {
        buffers[0] = buffer1;
        buffers[1] = buffer2;
    }

    public T Current => buffers[currentIndex];
    public T Next => buffers[1 - currentIndex];

    public void Swap() => currentIndex = 1 - currentIndex;
}

public class PhysicsSimulation
{
    private DoubleBuffer<PhysicsState> stateBuffer;

    public void Update(float deltaTime)
    {
        ComputeNextState(stateBuffer.Current, stateBuffer.Next, deltaTime);
        stateBuffer.Swap();
    }
}
```
