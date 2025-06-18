const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { Buffer } = require('node:buffer');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true }
});

// ⚠️ Configurá el puerto COM y baudrate según tu caso
const port = new SerialPort({
  path: 'COM3',       // <-- Cambiá esto si tu puerto es diferente
  baudRate: 9600,     // <-- Asegurate que coincida con el del PIC
  autoOpen: true     // Abrimos manualmente para manejar errores
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Abrimos el puerto
port.open((err) => {
  if (err) {
    return console.error('Error al abrir el puerto:', err.message);
  }
  console.log('Puerto serie abierto en COM3');
});

// Cuando recibimos una línea de texto
parser.on('data', async(data) => {
  console.log(await data)
  const texto = data.toString('utf-8');
  console.log('Dato recibido del PIC:', texto);
  io.emit('serial-data', texto); // envia al frontend
});

// Si hay errores
port.on('error', (err) => {
  console.error('Error del puerto serie:', err.message);
});

io.on('connection', (socket) => {
  console.log('Cliente conectado al socket');

  socket.on('enviar-comando', (letra) => {
    console.log(`Comando recibido del frontend: "${letra}"`);

    if (port && port.writable) {
      port.write(letra.toString('binary'), (err) => {
        if (err) {
          return console.error('Error al escribir al puerto serie:', err.message);
        }
        console.log(`Comando "${letra}" enviado al PIC`);
      });
    } else {
      console.error('Puerto serie no disponible');
    }
  });
});

server.listen(8080, () => {
  console.log('Servidor backend corriendo en http://localhost:8080');
});