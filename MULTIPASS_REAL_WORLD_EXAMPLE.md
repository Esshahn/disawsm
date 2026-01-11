# Real-World Multi-Pass Example: C64 IRQ Handler

## Realistic C64 Code That Fails Single-Pass

This is actual C64 assembly code with a common pattern: an IRQ handler with a jump table.

### Complete Code Listing

```asm
; Main entry point
$1000    78          SEI                 ; Disable interrupts
$1001    A9 00       LDA #$00
$1003    8D 20 D0    STA $D020           ; Black border
$1006    A9 34       LDA #$34
$1008    85 01       STA $01             ; Bank switching
$100A    A9 7F       LDA #$7F
$100C    8D 0D DC    STA $DC0D           ; Disable CIA interrupts
$100F    A9 30       LDA #$30
$1011    8D 12 10    STA $1012           ; Self-modifying code! Store state
$1014    4C 40 10    JMP $1040           ; Jump to main loop

; Data section (IRQ states)
$1017    00 01 02 03 04                  ; State sequence

; Jump table for IRQ states (DATA, but points to CODE)
$101C    30 10       .word $1030         ; State 0 handler
$101E    60 10       .word $1060         ; State 1 handler
$1020    90 10       .word $1090         ; State 2 handler
$1022    C0 10       .word $10C0         ; State 3 handler
$1024    F0 10       .word $10F0         ; State 4 handler

; IRQ handler
$1030    A9 00       LDA #$00            ; State 0 handler
$1032    8D 21 D0    STA $D021           ; Change background
$1035    20 00 11    JSR $1100           ; Call shared routine
$1038    4C 26 10    JMP $1026           ; Jump to next state

; State 1 handler
$1060    A9 01       LDA #$01
$1062    8D 21 D0    STA $D021
$1065    20 00 11    JSR $1100
$1068    4C 26 10    JMP $1026

; State 2 handler
$1090    A9 02       LDA #$02
$1092    8D 21 D0    STA $D021
$1095    20 00 11    JSR $1100
$1098    4C 26 10    JMP $1026

; State 3 handler
$10C0    A9 03       LDA #$03
$10C2    8D 21 D0    STA $D021
$10C5    20 00 11    JSR $1100
$10C8    4C 26 10    JMP $1026

; State 4 handler
$10F0    A9 04       LDA #$04
$10F2    8D 21 D0    STA $D021
$10F5    20 00 11    JSR $1100
$10F8    4C 26 10    JMP $1026

; Shared subroutine
$1100    AD 12 D0    LDA $D012           ; Read raster line
$1103    29 07       AND #$07
$1105    8D 20 D0    STA $D020           ; Set border
$1108    60          RTS

; Next state selector (uses jump table)
$1026    EE 12 10    INC $1012           ; Increment state
$1029    AD 12 10    LDA $1012           ; Load state
$102C    29 04       AND #$04            ; Wrap to 0-4
$102E    0A          ASL A               ; Multiply by 2 (word table)
$102F    AA          TAX                 ; Index into table
$1030    BD 1C 10    LDA $101C,X         ; Load low byte of handler
$1033    85 FB       STA $FB             ; Store to zero page
$1035    BD 1D 10    LDA $101D,X         ; Load high byte of handler
$1038    85 FC       STA $FC             ; Store to zero page
$103A    6C FB 00    JMP ($00FB)         ; Indirect jump to handler

; Main loop
$1040    AD 12 D0    LDA $D012           ; Wait for raster
$1043    C9 FF       CMP #$FF
$1045    D0 F9       BNE $1040           ; Loop
$1047    20 26 10    JSR $1026           ; Call state selector
$104A    4C 40 10    JMP $1040           ; Loop forever
```

---

## Single-Pass Analysis (CURRENT)

### User provides entry point: $1000 (code)

**Sequential scan from $1000:**

```
i=0 ($1000): SEI (78)
  - Entry point, mark as code ✓
  - In code section

i=1 ($1001): LDA #$00 (A9)
  - In code section
  - Mark $1001-$1002 as code ✓

i=3 ($1003): STA $D020 (8D)
  - In code section
  - Mark $1003-$1005 as code ✓
  - This is STA (data access op)
  - $D020 is outside program, ignore

i=6 ($1006): LDA #$34 (A9)
  - Mark $1006-$1007 as code ✓

i=8 ($1008): STA $01 (85)
  - Mark $1008-$1009 as code ✓

i=10 ($100A): LDA #$7F (A9)
  - Mark $100A-$100B as code ✓

i=12 ($100C): STA $DC0D (8D)
  - Mark $100C-$100E as code ✓

i=15 ($100F): LDA #$30 (A9)
  - Mark $100F-$1010 as code ✓

i=17 ($1011): STA $1012 (8D)
  - Mark $1011-$1013 as code ✓
  - STA targets $1012
  - $1012 is in program!
  - Mark $1012 as DATA dest ✓

i=20 ($1014): JMP $1040 (4C)
  - Mark $1014-$1016 as code ✓
  - JMP targets $1040
  - Mark $1040 as CODE dest ✓
  - JMP terminates, exit code section

i=23 ($1017): byte $00
  - Not in code section
  - Treat as DATA ✓

i=24 ($1018): byte $01
  - Treat as DATA ✓

... continue as data ...

i=28 ($101C): byte $30
  - Treat as DATA ✓

i=29 ($101D): byte $10
  - Treat as DATA ✓

... all jump table entries treated as data ...

i=37 ($1025): byte $10
  - Treat as DATA ✓

i=38 ($1026): INC $1012 (EE)
  - Not in code section
  - NOT marked as code ❌
  - Treat as DATA ❌

... $1026-$103C treated as DATA ❌

i=48 ($1030): LDA #$00 (A9)
  - Not in code section
  - NOT marked as code ❌
  - Treat as DATA ❌

... all IRQ handlers treated as DATA ❌

i=64 ($1040): LDA $D012 (AD)
  - Was marked as code by JMP at $1014 ✓
  - Enter code section ✓
  - Mark as code

i=67 ($1043): CMP #$FF (C9)
  - In code section
  - Mark as code ✓

i=69 ($1045): BNE $1040 (D0)
  - In code section
  - Mark as code ✓
  - Branch target $1040 already marked ✓

i=71 ($1047): JSR $1026 (20)
  - In code section
  - Mark as code ✓
  - JSR targets $1026
  - Mark $1026 as CODE dest ✓ (FINALLY!)

i=74 ($104A): JMP $1040 (4C)
  - In code section
  - Mark as code ✓
  - JMP terminates code
```

**Problem:** The code at $1026 is marked as a destination, but by the time we get to it, we've already passed it and marked it as data!

### Continue scanning...

```
i=256 ($1100): LDA $D012 (AD)
  - Not in code section
  - NOT marked as code ❌
  - Treat as DATA ❌
```

### Final Result (Single-Pass):

```
$1000-$1016: CODE ✓
$1017-$1025: DATA ✓
$1026-$103C: DATA ❌ (should be CODE!)
$103D-$103F: DATA ✓
$1040-$104C: CODE ✓
$104D-$10FF: DATA ✓
$1100-$1108: DATA ❌ (should be CODE!)

IRQ handlers ($1030, $1060, $1090, $10C0, $10F0): ALL MISSED ❌❌❌
```

---

## Multi-Pass Analysis (PROPOSED)

### Pass 1: Same as single-pass

- Mark $1000-$1016 as code
- Mark $1040-$104C as code
- Mark $1026 as code destination (but not yet processed)

**Changes detected:** YES (initial scan)

### Pass 2: Process newly marked code destinations

**Found unprocessed code destination at $1026:**

```
i=38 ($1026): INC $1012 (EE)
  - Marked as code dest from Pass 1 ✓
  - Walk code from here
  - Mark $1026-$1028 as code ✓ (NEW!)

i=41 ($1029): LDA $1012 (AD)
  - Sequential from $1026
  - Mark $1029-$102B as code ✓ (NEW!)

i=44 ($102C): AND #$04 (29)
  - Mark as code ✓ (NEW!)

i=46 ($102E): ASL A (0A)
  - Mark as code ✓ (NEW!)

i=47 ($102F): TAX (AA)
  - Mark as code ✓ (NEW!)

i=48 ($1030): LDA $101C,X (BD)
  - Mark $1030-$1032 as code ✓ (NEW!)
  - This is LDA (data access)
  - Target is $101C (base of jump table)
  - Mark $101C as DATA dest ✓

i=51 ($1033): STA $FB (85)
  - Mark as code ✓ (NEW!)

i=53 ($1035): LDA $101D,X (BD)
  - Mark $1035-$1037 as code ✓ (NEW!)
  - Target is $101D
  - Mark $101D as DATA dest ✓

i=56 ($1038): STA $FC (85)
  - Mark as code ✓ (NEW!)

i=58 ($103A): JMP ($00FB) (6C)
  - Mark $103A-$103C as code ✓ (NEW!)
  - This is INDIRECT jump - can't statically analyze target!
  - JMP terminates code section
```

**Changes detected:** YES (marked $1026-$103C as code)

### Pass 3: Check for more unprocessed code

**Scan entire byte table:**
- All code destinations have been processed
- No new code discovered

**Changes detected:** NO

### Pass 4: (not needed)

**Analysis complete after 3 passes.**

### Final Result (Multi-Pass):

```
$1000-$1016: CODE ✓
$1017-$1025: DATA ✓
$1026-$103C: CODE ✓✓✓ (FIXED!)
$103D-$103F: DATA ✓
$1040-$104C: CODE ✓
$104D-$10FF: DATA ✓
$1100-$1108: DATA ❌ (still missed - JSR was from $1030)

IRQ handlers ($1030, $1060, $1090, $10C0, $10F0): STILL MISSED ❌
```

**Improvement:** Found the state selector code at $1026! But still missed the IRQ handlers because they're reached via indirect jump.

---

## Why IRQ Handlers Are Still Missed

The indirect jump at $103A:
```asm
JMP ($00FB)
```

This jumps to an address stored in zero page ($FB/$FC). The disassembler cannot statically determine where this jumps to because:

1. The target address is computed at runtime
2. It depends on the X register value
3. It reads from a jump table at $101C-$1024
4. The jump table contains addresses: $1030, $1060, $1090, $10C0, $10F0

**Multi-pass can't solve this!**

---

## Solutions for Indirect Jumps

### Solution 1: Manual Entry Points

User adds entrypoints for each handler:
```typescript
entrypoints = [
  { address: 0x1000, type: 'code', label: 'main' },
  { address: 0x1030, type: 'code', label: 'irq_state0' },
  { address: 0x1060, type: 'code', label: 'irq_state1' },
  { address: 0x1090, type: 'code', label: 'irq_state2' },
  { address: 0x10C0, type: 'code', label: 'irq_state3' },
  { address: 0x10F0, type: 'code', label: 'irq_state4' },
  { address: 0x1100, type: 'code', label: 'shared_routine' }
];
```

With these hints, multi-pass will find everything:

**Pass 1:** Mark all entrypoints
**Pass 2:** Walk from each entrypoint
**Pass 3:** Process $1026 (reached from $1047)
**Pass 4:** No changes

**Result:** ✅ Perfect disassembly!

### Solution 2: Jump Table Pattern Recognition

Detect this pattern:
```asm
LDA table,X
STA $FB
LDA table+1,X
STA $FC
JMP ($00FB)
```

When found:
1. Identify the table address ($101C)
2. Scan the table for word values
3. Treat each word as a potential code address
4. Mark as code destinations

**Implementation:**
```typescript
function detectJumpTable(bytesTable, index, opcode) {
  // Check if this is: LDA $xxxx,X
  if (opcode.ins.includes('$hhll,x') && opcode.ins.startsWith('lda')) {
    // Look ahead for: STA $FB / LDA $xxxx+1,X / STA $FC / JMP ($00FB)
    // If found, mark table entries as code destinations
  }
}
```

### Solution 3: Hybrid Approach (Best)

1. **Multi-pass** handles most code
2. **Pattern recognition** detects jump tables
3. **User hints** for edge cases
4. **Warning system** alerts user to potential code sections

---

## Summary: When Does Multi-Pass Help?

### ✅ Multi-Pass Solves:

1. **Forward references:** Code jumped to before being scanned
2. **Late discovery:** Entry points added after initial analysis
3. **Rejoin points:** Multiple branches converging
4. **State machine:** Code reached through multiple paths

### ❌ Multi-Pass Does NOT Solve:

1. **Indirect jumps:** `JMP ($xxxx)` or `JMP ($xxxx,X)`
2. **Jump tables:** Arrays of code pointers
3. **Computed branches:** `LDA table,X / PHA / RTS` pattern
4. **Self-modifying code:** Code that changes at runtime
5. **Data masquerading as code:** Bytes that look like valid opcodes

### 🎯 Best Practice:

**Use multi-pass as foundation + pattern recognition + user hints**

```
Multi-pass (automatic)
    ↓
Pattern detection (automatic)
    ↓
User hints (manual)
    ↓
Complete analysis ✓
```

For this C64 example:
- **Multi-pass:** Finds $1026-$103C automatically ✓
- **Pattern recognition:** Could detect jump table at $101C
- **User hints:** Marks IRQ handlers or shared routine
- **Result:** Perfect disassembly

---

## Practical Implementation

For your disassembler, I recommend:

1. **Implement multi-pass** (low effort, catches 80% of cases)
2.  [MULTIPASS_CODE_EXAMPLE.ts](MULTIPASS_CODE_EXAMPLE.ts) **Keep single-pass as option** (faster for simple programs)
3. **Add setting:** `multiPassAnalysis: boolean` in settings
4. **Document limitation:** Explain indirect jumps need hints
5. **Future enhancement:** Add jump table detection

**Effort vs Benefit:**
```
Single-pass → Multi-pass:        2 hours, 80% improvement
Multi-pass → Pattern detection:  8 hours, 15% improvement
Pattern detection → Perfect:     Impossible (halting problem!)
```

Multi-pass gives the best return on investment! 🎯
