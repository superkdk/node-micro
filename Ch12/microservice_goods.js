'use strict';

const cluster = require('cluster');

// 비지니스 로직 파일 참조
const business = require('../Ch05/monolithic_goods');

// Server 클래스 참조
class goods extends require('./server') {
  constructor() {
    // 부모 클래스 생성자 호출
    super('goods', 
      process.argv[2] ? Number(process.argv[2]) : 9010,
      [ 'POST/goods', 'GET/goods', 'DELETE/goods' ]
    );

    // Distributor 접속
    this.connectToDistributor('127.0.0.1', 9000, (data) => {
      console.log('Distributor Notification', data);
    });
  }

  // 클라이언트 요청에 따른 비지니스 로직 호출
  onRead(socket, data) {
    console.log('onRead', socket.remoteAddress, socket.remotePort, data);
    business.onRequest(socket, data.method, data.uri, data.params, (s, packet) => {
      socket.write(JSON.stringify(packet) + '¶');
    });
  }
}

if(cluster.isMaster) {
  cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // 인스턴스 생성
  new goods();
}