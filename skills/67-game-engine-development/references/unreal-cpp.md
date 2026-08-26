# Unreal Engine — C++

Codigo portado de `Jeffallan/claude-skills` (MIT) — ver `## Fontes` no `SKILL.md` principal.

## Padrao de Actor Component

`UPROPERTY(EditAnywhere, BlueprintReadWrite)` expoe o campo ao editor e ao Blueprint; usar
`AllowPrivateAccess` pra manter o campo privado em C++ mas visivel no editor.

```cpp
// Header: MyCharacter.h
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "MyCharacter.generated.h"

UCLASS()
class MYGAME_API AMyCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AMyCharacter();

protected:
    virtual void BeginPlay() override;

public:
    virtual void Tick(float DeltaTime) override;
    virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

private:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement", meta = (AllowPrivateAccess = "true"))
    float WalkSpeed = 600.0f;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera", meta = (AllowPrivateAccess = "true"))
    class UCameraComponent* CameraComponent;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera", meta = (AllowPrivateAccess = "true"))
    class USpringArmComponent* SpringArm;

    void MoveForward(float Value);
    void MoveRight(float Value);
};
```

```cpp
// Implementacao: MyCharacter.cpp
#include "MyCharacter.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"

AMyCharacter::AMyCharacter()
{
    PrimaryActorTick.bCanEverTick = true;

    SpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("SpringArm"));
    SpringArm->SetupAttachment(RootComponent);
    SpringArm->TargetArmLength = 300.0f;
    SpringArm->bUsePawnControlRotation = true;

    CameraComponent = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    CameraComponent->SetupAttachment(SpringArm, USpringArmComponent::SocketName);
}

void AMyCharacter::BeginPlay()
{
    Super::BeginPlay();
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
}

void AMyCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    PlayerInputComponent->BindAxis("MoveForward", this, &AMyCharacter::MoveForward);
    PlayerInputComponent->BindAxis("MoveRight", this, &AMyCharacter::MoveRight);
    PlayerInputComponent->BindAxis("Turn", this, &APawn::AddControllerYawInput);
    PlayerInputComponent->BindAxis("LookUp", this, &APawn::AddControllerPitchInput);
}

void AMyCharacter::MoveForward(float Value)
{
    if (Controller && Value != 0.0f)
    {
        const FRotator Rotation = Controller->GetControlRotation();
        const FRotator YawRotation(0, Rotation.Yaw, 0);
        const FVector Direction = FRotationMatrix(YawRotation).GetUnitAxis(EAxis::X);
        AddMovementInput(Direction, Value);
    }
}
```

## Funcao Chamavel de Blueprint

`BlueprintCallable` expoe a funcao como no com pino de execucao; `BlueprintPure` expoe como getter sem
pino (sem efeito colateral); `BlueprintNativeEvent` permite override em Blueprint com implementacao
C++ default.

```cpp
UCLASS()
class MYGAME_API UHealthComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UHealthComponent();

protected:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Health")
    float MaxHealth = 100.0f;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Health")
    float CurrentHealth;

    UPROPERTY(BlueprintAssignable, Category = "Health")
    FOnHealthChangedSignature OnHealthChanged;

public:
    UFUNCTION(BlueprintCallable, Category = "Health")
    void TakeDamage(float Damage);

    UFUNCTION(BlueprintCallable, Category = "Health")
    void Heal(float Amount);

    UFUNCTION(BlueprintPure, Category = "Health")
    float GetHealthPercent() const { return CurrentHealth / MaxHealth; }

    // Evento nativo que pode ser sobrescrito em Blueprint
    UFUNCTION(BlueprintNativeEvent, Category = "Health")
    void OnDeath();
    virtual void OnDeath_Implementation();
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnHealthChangedSignature, float, Health, float, MaxHealth);
```

## Timer e Operacao Assincrona

Preferir `FTimerHandle` sobre `Tick` pra atualizacao periodica — mais barato, e desliga
`PrimaryActorTick.bCanEverTick` quando o Actor nao precisa de Tick por frame.

```cpp
class AWeapon : public AActor
{
private:
    FTimerHandle FireRateTimer;

    UPROPERTY(EditAnywhere, Category = "Weapon")
    float FireRate = 0.2f; // Segundos entre disparos

public:
    void StartFiring()
    {
        Fire(); // Primeiro disparo imediato
        GetWorldTimerManager().SetTimer(FireRateTimer, this, &AWeapon::Fire, FireRate, true);
    }

    void StopFiring()
    {
        GetWorldTimerManager().ClearTimer(FireRateTimer);
    }

    void Fire()
    {
        FVector Location = GetActorLocation();
        FRotator Rotation = GetActorRotation();
        GetWorld()->SpawnActor<AProjectile>(ProjectileClass, Location, Rotation);
    }
};
```

## Object Pooling no Unreal

Padrao equivalente ao pooling de Unity, mas usando `SetActorHiddenInGame`/`SetActorEnableCollision`/
`SetActorTickEnabled` em vez de `SetActive`.

```cpp
UCLASS()
class APooledActor : public AActor
{
    GENERATED_BODY()

private:
    bool bIsActive = false;

public:
    void Activate()
    {
        bIsActive = true;
        SetActorHiddenInGame(false);
        SetActorEnableCollision(true);
        SetActorTickEnabled(true);
    }

    void Deactivate()
    {
        bIsActive = false;
        SetActorHiddenInGame(true);
        SetActorEnableCollision(false);
        SetActorTickEnabled(false);
    }

    bool IsActive() const { return bIsActive; }
};

UCLASS()
class AObjectPool : public AActor
{
    GENERATED_BODY()

private:
    UPROPERTY(EditAnywhere, Category = "Pool")
    TSubclassOf<APooledActor> PooledClass;

    UPROPERTY(EditAnywhere, Category = "Pool")
    int32 PoolSize = 50;

    UPROPERTY()
    TArray<APooledActor*> Pool;

protected:
    virtual void BeginPlay() override
    {
        Super::BeginPlay();

        for (int32 i = 0; i < PoolSize; i++)
        {
            APooledActor* Actor = GetWorld()->SpawnActor<APooledActor>(PooledClass);
            Actor->Deactivate();
            Pool.Add(Actor);
        }
    }

public:
    APooledActor* GetPooledActor()
    {
        for (APooledActor* Actor : Pool)
        {
            if (!Actor->IsActive())
            {
                Actor->Activate();
                return Actor;
            }
        }

        // Pool esgotado — expandir sob demanda
        APooledActor* NewActor = GetWorld()->SpawnActor<APooledActor>(PooledClass);
        Pool.Add(NewActor);
        NewActor->Activate();
        return NewActor;
    }

    void ReturnToPool(APooledActor* Actor)
    {
        Actor->Deactivate();
    }
};
```

## Data Asset e Struct

`USTRUCT` pra dado leve reusavel; `UDataAsset` pra config de conteudo editavel no editor (equivalente
funcional ao ScriptableObject do Unity).

```cpp
USTRUCT(BlueprintType)
struct FWeaponStats
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName WeaponName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Damage = 10.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float FireRate = 0.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 MagazineSize = 30;
};

UCLASS()
class UWeaponDataAsset : public UDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon")
    FWeaponStats Stats;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon")
    TSubclassOf<class AProjectile> ProjectileClass;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon")
    USoundBase* FireSound;
};
```

## Smart Pointer

`TSharedPtr` pra posse compartilhada, `TWeakPtr` pra evitar referencia circular, `TUniquePtr` pra posse
exclusiva. Nao usar ponteiro raw pra `UObject` — quebra o garbage collector do Unreal; usar `UPROPERTY()`
em vez disso pra qualquer referencia a `UObject`/`AActor` que precise sobreviver ao ciclo de GC.

```cpp
TSharedPtr<FGameData> GameData = MakeShared<FGameData>();
TWeakPtr<AActor> WeakActorRef = SharedActorPtr;
TUniquePtr<FComplexSystem> System = MakeUnique<FComplexSystem>();
```

## Checklist de Performance

- `UPROPERTY()` pra qualquer referencia a `UObject` (garbage collection) — nunca ponteiro raw
- Cachear referencia de componente em `BeginPlay()`
- `PrimaryActorTick.bCanEverTick = false` quando Tick nao for necessario
- Preferir Timer sobre Tick pra atualizacao periodica
- `BlueprintPure` pra funcao getter (sem pino de execucao, mais barato pro grafo de Blueprint)
- Perfilar com Unreal Insights e comandos stat (`stat fps`, `stat unit`, `stat game`)
- Forward declaration em header, include completo so no `.cpp`
- Object pooling pra Actor spawnado com frequencia
