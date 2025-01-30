var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
require('dotenv').config();

if (!process.env.SERIAL_PORT)
  throw new Error('Missing SERIAL_PORT environment variable');

if (!process.env.SERIAL_BAUDRATE)
  throw new Error('Missing SERIAL_BAUDRATE environment variable');

// Remplacez par votre port série et la vitesse de transmission (9600 par défaut)
const SERIAL_PORT = process.env.SERIAL_PORT;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2
});

let serialport = new SerialPort(SERIAL_PORT, {
  baudRate: parseInt(process.env.SERIAL_BAUDRATE) || 9600,
}, function (err) {
  if (err) {
    return console.log('Creating SerialPort', err.message);
  }
});

serialport.pipe(xbeeAPI.parser);
xbeeAPI.builder.pipe(serialport);

const BROADCAST_ADDRESS = "FFFFFFFFFFFFFFFF";

serialport.on("open", function () {
  // Commande locale pour demander la valeur de NODE IDENTIFIER
  var frame_obj = {
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "NI",
    commandParameter: [],
  };

  xbeeAPI.builder.write(frame_obj);

  // Commande distante pour demander la valeur de NODE IDENTIFIER
  frame_obj = {
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: BROADCAST_ADDRESS,
    command: "NI",
    commandParameter: [],
  };
  xbeeAPI.builder.write(frame_obj);
});

// Toutes les trames analysées par le XBee seront émises ici
xbeeAPI.parser.on("data", function (frame) {
  if (C.FRAME_TYPE.JOIN_NOTIFICATION_STATUS === frame.type) {
    console.log("Un nouvel appareil a rejoint le réseau. Vous pouvez le enregistrer comme nouvel appareil disponible.");
  }

  if (C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET === frame.type) {
    console.log("C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET");
    let dataReceived = String.fromCharCode.apply(null, frame.data);
    console.log(">> ZIGBEE_RECEIVE_PACKET >", dataReceived);
  }

  if (C.FRAME_TYPE.NODE_IDENTIFICATION === frame.type) {
    console.log("NODE_IDENTIFICATION");
  } else if (C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {
    console.log("ZIGBEE_IO_DATA_SAMPLE_RX");

    // Vérifiez si les échantillons analogiques existent
    if (frame.analogSamples) {
      const pressureValue1 = frame.analogSamples.AD1; // Valeur du capteur sur AD1
      const pressureValue2 = frame.analogSamples.AD2; // Valeur du capteur sur AD2

      // Affichez uniquement les valeurs valides
      if (typeof pressureValue1 === 'number' && !isNaN(pressureValue1)) {
        console.log("Valeur du capteur de pression AD1 : ", pressureValue1);
      }

      if (typeof pressureValue2 === 'number' && !isNaN(pressureValue2)) {
        console.log("Valeur du capteur de pression AD2 : ", pressureValue2);
      }
    } else {
      console.log("Aucun échantillon analogique reçu.");
    }
  } else if (C.FRAME_TYPE.REMOTE_COMMAND_RESPONSE === frame.type) {
    console.log("REMOTE_COMMAND_RESPONSE");
  } else {
    console.debug(frame);
    let dataReceived = String.fromCharCode.apply(null, frame.commandData);
    console.log(dataReceived);
  }
});