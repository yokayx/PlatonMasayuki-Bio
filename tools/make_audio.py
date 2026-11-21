#!/usr/bin/env python3
"""
Генератор фонового трека для сайта: тёмный эмбиент с дождём.
Синтез без внешних зависимостей (только stdlib) -> assets/audio/blood-and-rain.wav

Запуск:  python3 tools/make_audio.py
"""

import array
import math
import os
import random
import struct
import wave

SR = 22050
DUR = 48.0
N = int(SR * DUR)
TAU = math.pi * 2
rng = random.Random(7)

buf = array.array("d", [0.0]) * N


def add(i, value):
    if 0 <= i < N:
        buf[i] += value


# ---------------------------------------------------------------- rain bed
# Шум, отфильтрованный так, чтобы получился «мягкий ливень за окном».
noise_lp = 0.0
noise_slow = 0.0
for i in range(N):
    t = i / SR
    white = rng.uniform(-1.0, 1.0)
    noise_lp += (white - noise_lp) * 0.33
    noise_slow += (noise_lp - noise_slow) * 0.0035
    rain = (noise_lp - noise_slow) * 0.85
    gust = 0.72 + 0.28 * math.sin(TAU * t / 11.0) * math.sin(TAU * t / 3.7 + 1.1)
    buf[i] += rain * 0.115 * gust

# ---------------------------------------------------------------- low drone
for freq, amp, lfo in (
    (41.20, 0.085, 0.07),
    (55.00, 0.085, 0.05),
    (55.18, 0.070, 0.09),
    (82.41, 0.036, 0.06),
    (110.0, 0.020, 0.11),
):
    w = TAU * freq / SR
    wl = TAU * lfo
    for i in range(N):
        add(i, amp * math.sin(w * i) * (0.62 + 0.38 * math.sin(wl * i)))

# ---------------------------------------------------------------- pad chords
CHORDS = [
    (220.00, 261.63, 329.63),   # Am
    (174.61, 220.00, 261.63),   # F
    (146.83, 174.61, 220.00),   # Dm
    (164.81, 207.65, 246.94),   # E
]
SEG = DUR / len(CHORDS)
XFADE = 4.0

for i in range(N):
    t = i / SR
    seg = min(int(t // SEG), len(CHORDS) - 1)
    local = t - seg * SEG
    env = min(1.0, local / XFADE, (SEG - local) / XFADE)
    env = max(0.0, env)
    env = env * env * (3 - 2 * env)
    if env <= 0.0:
        continue
    chord = CHORDS[seg]
    val = 0.0
    for k, f in enumerate(chord):
        det = 1.0 + 0.0012 * math.sin(TAU * t / (5.0 + k))
        val += math.sin(TAU * f * det * t + k) * (0.5 if k else 0.65)
    # мягкая «органная» окраска
    val += 0.18 * math.sin(TAU * chord[0] * 2 * t)
    buf[i] += val * env * 0.030

# ---------------------------------------------------------------- bells
SCALE = (440.00, 523.25, 587.33, 659.25, 783.99, 880.00)
t_bell = 1.5
events = []
while t_bell < DUR - 4:
    events.append((t_bell, rng.choice(SCALE), rng.uniform(0.55, 1.0)))
    t_bell += rng.uniform(1.6, 3.4)

for start, freq, amp in events:
    s0 = int(start * SR)
    length = int(2.8 * SR)
    w = TAU * freq / SR
    w2 = TAU * freq * 2.004 / SR
    for j in range(length):
        idx = s0 + j
        if idx >= N:
            break
        e = math.exp(-3.6 * j / SR)
        attack = min(1.0, j / (0.012 * SR))
        buf[idx] += (math.sin(w * j) + 0.28 * math.sin(w2 * j)) * e * attack * amp * 0.042

# ---------------------------------------------------------------- seamless loop
# Последние 3 секунды подмешиваем в начало и обрезаем — стык петли без щелчка.
loop_fade = 3.0
X = int(loop_fade * SR)
for i in range(X):
    k = i / X
    buf[i] = buf[i] * k + buf[N - X + i] * (1 - k)
del buf[N - X:]

# ---------------------------------------------------------------- master
peak = max(1e-9, max(abs(v) for v in buf))
scale = 0.89 / peak
out = array.array("h", (int(max(-1.0, min(1.0, v * scale)) * 32767) for v in buf))

os.makedirs("assets/audio", exist_ok=True)
path = "assets/audio/blood-and-rain.wav"
with wave.open(path, "wb") as fh:
    fh.setnchannels(1)
    fh.setsampwidth(2)
    fh.setframerate(SR)
    fh.writeframes(out.tobytes())

print(f"{path}: {len(out) / SR:.1f}s, {os.path.getsize(path) / 1e6:.2f} MB, peak {peak:.3f}")
