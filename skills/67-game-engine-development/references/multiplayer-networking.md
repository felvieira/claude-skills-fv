# Multiplayer Networking

Codigo portado de `Jeffallan/claude-skills` (MIT) — ver `## Fontes` no `SKILL.md` principal.

## Arquitetura Cliente-Servidor

Modelo servidor-autoritativo: o servidor valida toda acao antes de aceitar. Cliente que envia
movimento invalido (distancia maior que a velocidade permitida em deltaTime) recebe correcao, nao
confianca cega — essa validacao e a base de qualquer defesa anti-cheat.

```csharp
public class NetworkPlayer
{
    public int PlayerId { get; set; }
    public Vector3 Position { get; set; }
    public Quaternion Rotation { get; set; }
    public float Health { get; set; }

    public bool TryMove(Vector3 newPosition, float deltaTime)
    {
        float maxDistance = MoveSpeed * deltaTime * 1.1f; // 10% de tolerancia

        if (Vector3.Distance(Position, newPosition) > maxDistance)
        {
            // Cliente enviou movimento invalido — possivel cheat
            return false;
        }

        Position = newPosition;
        return true;
    }
}

public class GameServer
{
    private Dictionary<int, NetworkPlayer> players = new();

    public void ProcessPlayerInput(int playerId, PlayerInput input)
    {
        if (!players.TryGetValue(playerId, out NetworkPlayer player))
            return;

        Vector3 newPosition = player.Position + input.Movement;

        if (player.TryMove(newPosition, Time.deltaTime))
        {
            BroadcastPlayerState(player);
        }
        else
        {
            // Correcao autoritativa enviada de volta
            SendPositionCorrection(playerId, player.Position);
        }
    }
}
```

## Sincronizacao de Estado

Buffer circular de estado histórico permite interpolar posicao entre dois snapshots recebidos —
suaviza movimento de jogador remoto mesmo com taxa de update de rede menor que o framerate visual.

```csharp
public class NetworkTransform
{
    private struct State
    {
        public float Timestamp;
        public Vector3 Position;
        public Quaternion Rotation;
    }

    private State[] stateBuffer = new State[32];
    private int bufferIndex = 0;

    public void ReceiveState(float timestamp, Vector3 position, Quaternion rotation)
    {
        stateBuffer[bufferIndex] = new State { Timestamp = timestamp, Position = position, Rotation = rotation };
        bufferIndex = (bufferIndex + 1) % stateBuffer.Length;
    }

    public void Interpolate(float renderTime)
    {
        State from = default;
        State to = default;

        for (int i = 0; i < stateBuffer.Length; i++)
        {
            if (stateBuffer[i].Timestamp <= renderTime)
                from = stateBuffer[i];
            else
            {
                to = stateBuffer[i];
                break;
            }
        }

        if (from.Timestamp == 0 || to.Timestamp == 0) return;

        float t = Mathf.Clamp01((renderTime - from.Timestamp) / (to.Timestamp - from.Timestamp));
        transform.position = Vector3.Lerp(from.Position, to.Position, t);
        transform.rotation = Quaternion.Slerp(from.Rotation, to.Rotation, t);
    }
}
```

## Predicao de Cliente

Aplicar input localmente antes da confirmacao do servidor (predicao), depois reconciliar re-aplicando
os inputs pendentes quando o servidor confirma a posicao autoritativa — reduz a sensacao de latencia
sem sacrificar autoridade do servidor.

```csharp
public class PredictivePlayer : MonoBehaviour
{
    private struct InputState
    {
        public int SequenceNumber;
        public float Timestamp;
        public Vector3 Movement;
    }

    private Queue<InputState> pendingInputs = new Queue<InputState>();
    private int sequenceNumber = 0;
    private Vector3 predictedPosition;

    void Update()
    {
        Vector3 movement = new Vector3(
            Input.GetAxis("Horizontal"), 0, Input.GetAxis("Vertical")
        ) * moveSpeed * Time.deltaTime;

        InputState input = new InputState
        {
            SequenceNumber = sequenceNumber++,
            Timestamp = Time.time,
            Movement = movement
        };

        SendInputToServer(input);

        // Aplicar localmente (predicao) antes da resposta do servidor
        predictedPosition += movement;
        transform.position = predictedPosition;

        pendingInputs.Enqueue(input);
    }

    public void ReceiveServerState(int lastProcessedInput, Vector3 serverPosition)
    {
        // Remover inputs ja confirmados pelo servidor
        while (pendingInputs.Count > 0 && pendingInputs.Peek().SequenceNumber <= lastProcessedInput)
            pendingInputs.Dequeue();

        // Partir da posicao autoritativa do servidor
        predictedPosition = serverPosition;

        // Reaplicar inputs pendentes (reconciliacao)
        foreach (var input in pendingInputs)
            predictedPosition += input.Movement;

        if (Vector3.Distance(transform.position, predictedPosition) > 0.1f)
            transform.position = predictedPosition;
    }
}
```

## Lag Compensation (Rewind no Servidor)

Pra hitscan (arma de tiro instantaneo), o servidor rebobina o estado dos outros jogadores pro timestamp
que o atirador realmente viu — sem isso, todo tiro contra alvo em movimento erra sistematicamente por
causa da latencia de rede.

```csharp
public class LagCompensation
{
    private struct HistoricalState
    {
        public float Timestamp;
        public Vector3 Position;
        public Quaternion Rotation;
        public Bounds Hitbox;
    }

    private Dictionary<int, Queue<HistoricalState>> playerHistory = new();
    private const float MaxHistoryTime = 1.0f; // 1 segundo de historico

    public void RecordState(int playerId, Vector3 position, Quaternion rotation, Bounds hitbox)
    {
        if (!playerHistory.ContainsKey(playerId))
            playerHistory[playerId] = new Queue<HistoricalState>();

        var queue = playerHistory[playerId];
        queue.Enqueue(new HistoricalState { Timestamp = Time.time, Position = position, Rotation = rotation, Hitbox = hitbox });

        while (queue.Count > 0 && Time.time - queue.Peek().Timestamp > MaxHistoryTime)
            queue.Dequeue();
    }

    public bool ProcessHitscan(int shooterPlayerId, float clientTimestamp, Ray ray, out int hitPlayerId)
    {
        float targetTime = clientTimestamp; // Tempo percebido pelo atirador

        foreach (var kvp in playerHistory)
        {
            int playerId = kvp.Key;
            if (playerId == shooterPlayerId) continue;

            HistoricalState state = GetStateAtTime(kvp.Value, targetTime);

            if (state.Hitbox.IntersectRay(ray))
            {
                hitPlayerId = playerId;
                return true;
            }
        }

        hitPlayerId = -1;
        return false;
    }

    private HistoricalState GetStateAtTime(Queue<HistoricalState> history, float targetTime)
    {
        HistoricalState closest = default;
        float minDelta = float.MaxValue;

        foreach (var state in history)
        {
            float delta = Mathf.Abs(state.Timestamp - targetTime);
            if (delta < minDelta)
            {
                minDelta = delta;
                closest = state;
            }
        }

        return closest;
    }
}
```

## Serializacao de Mensagem de Rede

Serializacao binaria custom reduz overhead comparado a JSON/texto; compressao de vetor pra 16-bit por
componente reduz banda quando precisao total nao e necessaria (posicao de jogador raramente precisa
de float de 32-bit completo).

```csharp
using System;
using System.IO;

public class NetworkWriter
{
    private MemoryStream stream = new MemoryStream();
    private BinaryWriter writer;

    public NetworkWriter() => writer = new BinaryWriter(stream);

    public void WriteInt(int value) => writer.Write(value);
    public void WriteFloat(float value) => writer.Write(value);
    public void WriteBool(bool value) => writer.Write(value);
    public void WriteString(string value) => writer.Write(value);

    public void WriteVector3(Vector3 value)
    {
        writer.Write(value.x);
        writer.Write(value.y);
        writer.Write(value.z);
    }

    // Vetor comprimido (16 bits por componente)
    public void WriteVector3Compressed(Vector3 value, float min, float max)
    {
        writer.Write(CompressFloat(value.x, min, max));
        writer.Write(CompressFloat(value.y, min, max));
        writer.Write(CompressFloat(value.z, min, max));
    }

    private ushort CompressFloat(float value, float min, float max)
    {
        float normalized = Mathf.Clamp01((value - min) / (max - min));
        return (ushort)(normalized * ushort.MaxValue);
    }

    public byte[] ToArray() => stream.ToArray();
}

public class NetworkReader
{
    private BinaryReader reader;

    public NetworkReader(byte[] data) => reader = new BinaryReader(new MemoryStream(data));

    public int ReadInt() => reader.ReadInt32();
    public float ReadFloat() => reader.ReadSingle();
    public bool ReadBool() => reader.ReadBoolean();
    public string ReadString() => reader.ReadString();

    public Vector3 ReadVector3() => new Vector3(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());

    public Vector3 ReadVector3Compressed(float min, float max)
    {
        return new Vector3(
            DecompressFloat(reader.ReadUInt16(), min, max),
            DecompressFloat(reader.ReadUInt16(), min, max),
            DecompressFloat(reader.ReadUInt16(), min, max)
        );
    }

    private float DecompressFloat(ushort value, float min, float max)
    {
        float normalized = value / (float)ushort.MaxValue;
        return min + normalized * (max - min);
    }
}
```

## Interest Management (Relevancia)

So enviar update de jogador dentro do raio de relevancia — evita desperdicar banda com estado de
entidade que o cliente nao consegue nem ver.

```csharp
public class InterestManager
{
    private Dictionary<int, Vector3> playerPositions = new();
    private float relevancyRadius = 100f;

    public HashSet<int> GetRelevantPlayers(int playerId)
    {
        if (!playerPositions.TryGetValue(playerId, out Vector3 playerPos))
            return new HashSet<int>();

        HashSet<int> relevant = new HashSet<int>();

        foreach (var kvp in playerPositions)
        {
            if (kvp.Key == playerId) continue;

            if (Vector3.Distance(playerPos, kvp.Value) <= relevancyRadius)
                relevant.Add(kvp.Key);
        }

        return relevant;
    }

    public void BroadcastToRelevant(int senderId, byte[] message)
    {
        foreach (int recipientId in GetRelevantPlayers(senderId))
            SendMessage(recipientId, message);
    }
}
```

## Delta Compression

So enviar campo que mudou desde o ultimo estado transmitido, com flag de bit indicando quais campos
estao presentes no pacote — reduz drasticamente a banda quando a maioria dos campos fica estavel entre
updates.

```csharp
public class DeltaCompressor
{
    private Dictionary<int, NetworkPlayer> lastSentState = new();

    public byte[] CompressState(NetworkPlayer current)
    {
        if (!lastSentState.TryGetValue(current.PlayerId, out NetworkPlayer previous))
            return SerializeFullState(current); // Primeira vez — enviar estado completo

        NetworkWriter writer = new NetworkWriter();
        byte flags = 0;

        if (Vector3.Distance(current.Position, previous.Position) > 0.01f)
        {
            flags |= 1 << 0;
            writer.WriteVector3Compressed(current.Position, -1000f, 1000f);
        }

        if (Quaternion.Angle(current.Rotation, previous.Rotation) > 1f)
        {
            flags |= 1 << 1;
            writer.WriteQuaternionCompressed(current.Rotation);
        }

        if (Mathf.Abs(current.Health - previous.Health) > 0.1f)
        {
            flags |= 1 << 2;
            writer.WriteFloat(current.Health);
        }

        byte[] data = writer.ToArray();
        byte[] result = new byte[data.Length + 1];
        result[0] = flags;
        Array.Copy(data, 0, result, 1, data.Length);

        lastSentState[current.PlayerId] = current;
        return result;
    }
}
```

## Boas Praticas de Performance de Rede

**Otimizacao de banda:**
- Comprimir dado de posicao/rotacao
- Usar delta compression
- Implementar sistema de relevancia
- Limitar taxa de update pela distancia
- Agrupar multiplos updates num pacote so

**Otimizacao de latencia:**
- Predicao de cliente pro jogador local
- Reconciliacao de servidor pra correcao
- Interpolacao de entidade pros outros jogadores
- Lag compensation pra arma hitscan

**Metricas alvo:**
- Latencia: < 100ms
- Tick rate: 20-60 Hz (depende do tipo de jogo)
- Tamanho de pacote: < 1200 bytes (evitar fragmentacao)
- Taxa de update: 10-20 Hz pra objeto distante, 60 Hz pra objeto proximo

**Consideracoes de seguranca:**
- Servidor-autoritativo pra toda logica de jogo
- Validar todo input do cliente
- Rate limiting pra prevenir flood
- Criptografar dado sensivel
- Medida anti-cheat (checagem de sanidade, analise estatistica)
