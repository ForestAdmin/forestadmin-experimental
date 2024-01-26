import * as net from 'net';

function getRandomPort(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isPortInUse(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(true); // Port is in use
    });
    server.once('listening', () => {
      server.close();
      resolve(false); // Port is available
    });
    server.listen(port, '127.0.0.1');
  });
}

async function getAvailablePort() {
  let port = getRandomPort(1000, 6000);

  // eslint-disable-next-line no-await-in-loop
  while (await isPortInUse(port)) {
    port = getRandomPort(1000, 6000);
  }

  return port;
}

export default getAvailablePort;
