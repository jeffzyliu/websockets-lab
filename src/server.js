import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import mongoose from 'mongoose';
import socketio from 'socket.io';
import http from 'http';
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';
import * as NoteController from './controllers/note_controller';

// DB Setup
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/notes';
mongoose.connect(mongoURI);
// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

// initialize
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// additional init stuff should go before hitting the routing

// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
server.listen(port);

console.log(`listening on: ${port}`);

// at the bottom of server.js
// lets register a connection listener
io.on('connection', async (socket) => {
// add these at the top of your: io.on('connection' section
  let emitToSelf = (notes) => {
    socket.emit('notes', notes);
  };
  emitToSelf = debounce(emitToSelf, 200);

  let emitToOthers = (notes) => {
    socket.broadcast.emit('notes', notes);
  };
  emitToOthers = throttle(emitToOthers, 25);

  const pushNotesSmoothed = async () => {
    const newNotes = await NoteController.getNotes();
    emitToSelf(newNotes);
    emitToOthers(newNotes);
  };

  // on first connection emit notes
  const notes = await NoteController.getNotes();
  socket.emit('notes', notes);
  // NoteController.getNotes().then((result) => {
  //   socket.emit('notes', result);
  // });

  // pushes notes to everybody
  const pushNotes = async () => {
    const newNotes = await NoteController.getNotes();
    io.sockets.emit('notes', newNotes);
    // NoteController.getNotes().then((result) => {
    //   // broadcasts to all sockets including ourselves
    //   io.sockets.emit('notes', result);
    // });
  };

  // creates notes and
  socket.on('createNote', async (fields) => {
    try {
      await NoteController.createNote(fields);
      pushNotes();
    } catch (error) {
      console.log(error);
      socket.emit('error', 'create failed');
    }
    // NoteController.createNote(fields).then((result) => {
    //   pushNotes();
    // }).catch((error) => {
    //   console.log(error);
    //   socket.emit('error', 'create failed');
    // });
  });

  // on update note do what is needful
  socket.on('updateNote', async (id, fields) => {
    try {
      await NoteController.updateNote(id, fields);
      if (fields.text) {
        pushNotes();
      } else {
        pushNotesSmoothed();
      }
    } catch (error) {
      console.log(error);
      socket.emit('error', 'update failed');
    }
    // NoteController.updateNote(id, fields).then(() => {
    //   pushNotes();
    // });
  });

  // on deleteNote do what is needful
  socket.on('deleteNote', async (id) => {
    try {
      await NoteController.deleteNote(id);
      pushNotes();
    } catch (error) {
      console.log(error);
      socket.emit('error', 'delete failed');
    }
  });
});
