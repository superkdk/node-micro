'use strict';

const cluster = require('cluster');
const fs = require('fs');
const elasticsearch = new require('elasticsearch').Client({
  host: '127.0.0.1:9200',
  log: 'trace'
});

// Server 클래스 참조
class logs extends require('./server') {
  constructor() {
    // 부모 클래스 생성자 호출
    super('logs', 
      process.argv[2] ? Number(process.argv[2]) : 9040,
      [ 'POST/logs' ]
    );

    // 스트림 생성
    this.writeStream = fs.createWriteStream('./log.txt', { flags: 'a' });

    // Distributor 접속
    this.connectToDistributor('127.0.0.1', 9000, (data) => {
      console.log('Distributor Notification', data);
    });
  }

  // 클라이언트 요청에 따른 비지니스 로직 호출
  onRead(socket, data) {
    const sz = new Date().toLocaleString() + '\t' + socket.remoteAddress + '\t' +
      socket.remotePort + '\t' + JSON.stringify(data) + '\n';
    console.log(sz);
    this.writeStream.write(sz);

    data.timestamp = new Date().toLocaleString();
    data.params = JSON.parse(data.params);
    elasticsearch.index({
      index: 'microservice',
      type: 'logs',
      body: data
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
  new logs();
}