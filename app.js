import twilios from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

import fetch from 'node-fetch';
import express from 'express';
import bodyParser from 'body-parser';
import 'openai'; //API de OpenAI
let conversationState = [];

const app = express();
const port = process.env.PORT || 3000;

const twilio = twilios;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Para procesar JSon
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const openai = process.env.OPENAI_API_KEY;

async function getCompletion(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + openai
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        ...conversationState,
        { "role": "user", "content": prompt }
      ],
    })
  })
  if (res.ok) {
    const data = await res.json();
    if (data.choices && data.choices.length > 0) {
      const chatGPTText = data.choices[0].message.content;
      console.log('Respuesta de ChatGPT:', chatGPTText);
      return chatGPTText;
    } else {
      console.error('La respuesta de ChatGPT no tiene las propiedades esperadas.');
      return null;
    }
  } else {
    console.error('Error al obtener la respuesta de ChatGPT:', res.statusText);
    return null;
  }
}

app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const messageBody = req.body.Body; // Extrae el mensaje de WhatsApp
    conversationState.push({ "role": "user", "content": messageBody });

    const chatGPTResponse = await getCompletion(messageBody); // Mandar el mensaje a chatGPT

    if (chatGPTResponse !== null) { //Enviamos la respuesta a nuestro whatsapp
      await client.messages.create({
        from: 'whatsapp:+14155238886',
        body: chatGPTResponse,
        to: 'whatsapp:+59175540850',
      });
    } else {
      console.error('La respuesta de ChatGPT no tiene las propiedades esperadas.');
    }

    res.send('Mensaje procesado');

  } catch (error) {
    console.error('Error al procesar el mensaje de WhatsApp:', error);
    res.status(500).send('Error al procesar el mensaje');
  }
});

// Inicia el servido
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});