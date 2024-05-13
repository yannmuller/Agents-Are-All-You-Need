# Description: This example demonstrates how to use the OpenAI API to describe an image taken from a Raspberry Pi camera.

import os
from openai import OpenAI
import subprocess

from dotenv import load_dotenv
import cv2
import pynput
from pynput import keyboard
import base64
import requests
import json

load_dotenv()

model = OpenAI()
model.timeout = 30


def on_release(key):
    if "char" in dir(key):
        if key.char == "p":
            print("\nphoto")

            # Activation de la caméra
            cam = cv2.VideoCapture(0)
            ret, img = cam.read()

            if ret:
                # Transformer l'image en base 64
                retval, buffer = cv2.imencode(".jpg", img)
                jpg_as_text = base64.b64encode(buffer).decode("utf-8")
                dataurl = f"data:image/jpg;base64,{jpg_as_text}"

                response = model.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You a portable camera device, your job is to describe what is taken in the image.",
                        }
                    ]
                    + [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": dataurl,
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": "Describe the image",
                                },
                            ],
                        }
                    ],
                    max_tokens=1024,
                )

                message = response.choices[0].message
                message_text = message.content

                if "ANSWER_NOT_FOUND" in message_text:
                    print("ERROR: Answer not found")
                    return "I was unable to find the answer on that website. Please pick another one"
                else:
                    print(f"GPT: {message_text}")
                    return message_text
            cam.release()


# Evenements du clavier
with keyboard.Listener(
    # on_press=on_press,
    on_release=on_release
) as listener:
    listener.join()
