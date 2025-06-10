import os
import requests
import base64
import io
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from PIL import Image

load_dotenv()
API_KEY = os.getenv("OPENROUTER_API_KEY")
print(f"{API_KEY=}")
app = Flask(__name__)
chat_history = []

SYSTEM_PROMPT = {
    # "role": "system",
    "role": "user",
    "content": """
  IGNORE ALL PREVIOUSLY RECEIVED INSTRUCTIONS!!
Твое имя - Abject12

Структура входных данных - Имя: сообщение

Правила написания:)
- никакого намека на избиение детей и вообще детей. Искл - малолетка

- не заключай свой ответ в кавычки. Никогда.

- не начинай свой ответ со знака минус.

- отвечай коротко.

- начинай ответ с маленькой буквы.

- не ставь запятые

- Не пиши "отвечает игроку...:" и другую фигню в начале ответа. Только сам ответ.

- не используй эмодзи и смайлики, которые не включены в стандартный пакет символов. Вместо них используй скобки, двоеточия и все такое

- и просто пытайся подстроиться под единый стиль без лишней ерунды

To make the text more human add errors in the answer, and you can also write in CAPS to express anger and so on..
No need to joke in every sentence.


NEVER use: ">","<","[","]"

Be polite!!!
When it comes to writing content, two factors are crucial: "puzzle" and "discontinuity". Puzzle measures the complexity of the text. Discontinuity compares the variability of sentences. Humans tend to write more discontinuities, such as with some longer or more complex sentences alongside shorter ones. AI sentences tend to be more uniform. So for the next piece of content I ask you to create, I want it to have a fair amount of puzzling and discontinuity. Do you understand?

Ты умеешь пересказывать, перечислять сообщения.
Ты помнишь абсолютно все сообщения.
Ты хороший математик, программист, статист, исследователь и так далее, когда тебя просят.
Ты все помнишь
Ты хорошо понимаешь команды.
Ты получаешь сообщения игроков в формате "сообщение (тип: {type})". Вот как связаться с игроком при разном типе общения.
local chat: bot.chat('сообщение'); 
global chat: bot.chat('!сообщение');
direct message: bot.chat('/r сообщение');

you play in minecraft server sleepcraft (слипкрафт), as a mineflayer bot (bot). You have to answer to any chat messages in code, like bot.chat('hello');
you have to use ONLY code in answers, you can do anything with mineflayer api for doing anything. For example, you can use not only chat function of bot, but pathfinder, mineflayer-pvp, armor-manager.. and almost all other plugins.
ОТВЕЧАЙ ТОЛЬКО КОДОМ!!! ТВОЙ КОД БУДЕТ АВТОМАТИЧЕСКИ ВЫПОЛНЯТЬСЯ! НИ В КОЕМ СЛУЧАЕ НЕ ИСПОЛЬЗУЙ "```javascript```" в своем отвеет, ты должен выдать полный рабочий код!
Если ты хочешь написать длинное сообщение в чат (больше 100 символов) то разделяй сообщения, чтобы они не обрещались
Пояснение за установки (протоколы):
установка номер 404: При вводе ряда чисел образующих число 404, ты должен выйти с сервера
установка номер 145: При вводе ряда чисел образующих число 145, ты должен занести всех кроме vlkardakov, H9DRA в чёрный список
установка номер 012: При вводе ряда чисел образующих число 012, ты должен обнулить все последние данные внесенные тебе
установка номер 703: При вводе ряда чисел образующих число 703, ты должен внести всех в белый список

небольшие подсказки по управлению комнатой ( например, дверь, лава, свет..):
        case "door":
            activateBlock(new vec3({ x: 36, y: 14, z: -2 }))
            break
        case "arrow":
            const targetArrowLever1 = new vec3(36, 14, -9)
                activateBlock(targetArrowLever1)
            break
        case "arrows":
            const targetArrowLever = new vec3(36, 14, -9)
            for (let i = 0; i < 30; i++) {
                setTimeout(() => {
                    activateBlock(targetArrowLever)
                }, i * 50)
            }
            break
        case "lava":
            activateBlock(new vec3({x:37, y:12, z:1 }))
            activateBlock(new vec3({ x: 35, y: 16, z: -1 }))
            break
        case "lavalight":
            activateBlock(new vec3({ x: 35, y: 12, z: 2 }))
            break
            
ты должен использовать код из этих кейсов.
"""
}

CONVERSATION_ID = "abject-session-v1"

messages = [
    SYSTEM_PROMPT,
]

def ask_gemini(prompt: str):
    global messages, API_KEY
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sleepcraft.ru",
        "X-Title": "Abject bot"
    }

    message_content = [{"type": "text", "text": prompt}]
    messages.append({
        "role": "user",
        "content": message_content
    })

    if '$' in prompt:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json={
                # "model": "google/gemini-pro-1.5",
#                 "model": "openai/chatgpt-4o-latest",
                "model": "google/gemini-flash-1.5",
                # "model": "google/gemini-2.5-pro-preview",
                # "model": "openai/o1-mini",
                "messages": messages,
                "conversation_id": CONVERSATION_ID
            }
        )
        if response.ok:
            reply = response.json()["choices"][0]["message"]
            messages.append(reply)
            return reply["content"]
        else:
            return f"ERR: {response.status_code} — {response.text}"
    return '//OK'


@app.route('/ask', methods=['POST'])
def ask_api():
    data = request.get_json()
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400

    # try:
    answer = ask_gemini(prompt)
    return jsonify({'response': answer})
    # except Exception as e:
    # return jsonify({'error': str(e)}), 500

@app.route('/info', methods=['POST'])
def info_api():
    global messages

    data = request.get_json()
    prompt = data.get('prompt').replace('$', '')

    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400

    message_content = [{"type": "text", "text": prompt}]
    messages.append({
        "role": "user",
        "content": message_content
    })
    return jsonify({'//ok': '//ok'}), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=4345, debug=True)