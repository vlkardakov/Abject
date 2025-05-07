from vosk import Model, KaldiRecognizer
import sys
import json

model = Model("vosk-model-small-ru-0.22")
rec = KaldiRecognizer(model, 48000)

while True:
    data = sys.stdin.buffer.read(4000)
    if not data:
        break
    if rec.AcceptWaveform(data):
        res = json.loads(rec.Result())
        print(res["text"], flush=True)
