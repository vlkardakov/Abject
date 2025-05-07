from vosk import Model, KaldiRecognizer
import sys
import wave
import json

model = Model("vosk-model-small-ru-0.22")
rec = KaldiRecognizer(model, 48000)

with open("audio.raw", "rb") as f:
    while True:
        data = f.read(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            print(json.loads(rec.Result())["text"])
