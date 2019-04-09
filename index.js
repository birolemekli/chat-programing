var express = require('express');
var http = require('http');
var app = express();
var socket = require('socket.io');
var path = require('path');
const mongo = require('mongodb').MongoClient;

var server = http.createServer(app);
var io=socket(server);

app.use(express.static(__dirname + '/node_modules'));

app.get('/',function(req,res){

    res.sendFile(__dirname + '/public/index.html');

});

server.listen(5000,function(){
    console.log("Sunucu 5000 portunu dinliyor...");
});

// Connect to mongo
mongo.connect('mongodb://127.0.0.1/chat', function(err, db){
    if(err){
        console.log('MongoDB bağlantıda hata oldu',err);
    }
        console.log('MongoDB bağlanıldı...');

    io.on('connection', function(socket) {
        console.log("istemci bağlandı...");
        
        let chat = db.collection('chats');
    
        // Databaseden veri getirme
        chat.find().limit(150).sort({_id:1}).toArray(function(err, res){
            if(err){
                throw err;
            }
            // Mesajları tüm clientlara emit etme
            socket.emit('output', res);
        });

        // Ad veya mesaj kontrolü için fonksiyon
        sendStatus = function(s){
            socket.emit('status', s);
        }

        // İnputtan gelen verileri işleme
        socket.on('input', function(data){
            let name = data.name;
            let message = data.message;
            console.log(name + ": "+ message);

            // Ad ve mesaj boş mu kontrolü boş ise sendStatus fonksiyonunu çağırır
            if(name == '' || message == ''){
                // Boşsa
                sendStatus('Lütfen isim ve mesaj giriniz');
            } else {
                // Database yazma işlemi
                chat.insert({name: name, message: message}, function(){
                    io.emit('output', [data]);
                });
            }
        });

        // Sil 
        socket.on('sil', function(data){
            // Databaseden silme işlemi
            chat.remove({}, function(){
                // 
                io.emit('cleared');
                // Durum yazdırılır
                sendStatus({
                    message: 'Tüm mesajlar silindi',
                    clear: true
                });
            });
        });

        socket.on('disconnect', function()
            {
                console.log('Kullanıcı ayrıldı...');
            });
    });
});