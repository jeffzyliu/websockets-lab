import Note from '../models/note';

export const getNotes = async () => {
  const notes = await Note.find({});
  return notes.reduce((result, item) => {
    result[item.id] = item;
    return result;
  }, {});
};

export const deleteNote = async (id) => {
  // to quote Prof. Cormen: left as an exercise to the reader
  // remember to return the mongoose function you use rather than just delete
  return Note.findByIdAndDelete(id);
};

export const createNote = async (fields) => {
  // you know the drill. create a new Note mongoose object
  // return .save()
  const note = new Note(fields);
  return note.save();
};

export const updateNote = async (id, fields) => {
  const note = await Note.findById(id);
  // check out this classy way of updating only the fields necessary
  Object.keys(fields).forEach((k) => {
    note[k] = fields[k];
  });
  return note.save();
};
