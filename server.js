const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ---------------- DATABASE ----------------
const db = new sqlite3.Database('./messages.db');

// Create table if needed
db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS message_store (
      id INTEGER PRIMARY KEY,
      message TEXT
    )
  `);

  // Create default row if missing
  db.run(`
    INSERT OR IGNORE INTO message_store (id, message)
    VALUES (1, 'HONK! No message found...')
  `);
});

// ---------------- WEB PAGE ----------------
app.get('/', (req, res) => {

  db.get(
    `SELECT message FROM message_store WHERE id = 1`,
    (err, row) => {

      const currentMessage = row ? row.message : '';

      res.send(`
        <html>
        <body style="font-family:sans-serif;padding:40px;max-width:600px;">

          <h1>ESP32 Message Controller</h1>

          <p><strong>Current Message:</strong></p>

          <div style="
            padding:15px;
            background:#f0f0f0;
            border-radius:8px;
            margin-bottom:20px;
          ">
            ${currentMessage}
          </div>

          <form method="POST" action="/update">

            <textarea
              name="message"
              rows="5"
              style="width:100%;padding:10px;font-size:16px;"
              placeholder="Enter message..."
            ></textarea>

            <br><br>

            <button
              type="submit"
              style="padding:12px 20px;font-size:16px;"
            >
              Send Message
            </button>

          </form>

        </body>
        </html>
      `);
    }
  );
});

// ---------------- UPDATE MESSAGE ----------------
app.post('/update', (req, res) => {

  const newMessage = req.body.message || '';

  db.run(
    `UPDATE message_store SET message = ? WHERE id = 1`,
    [newMessage],
    (err) => {

      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }

      console.log('Message updated:', newMessage);

      res.redirect('/');
    }
  );
});

// ---------------- ESP32 ENDPOINT ----------------
app.get('/message', (req, res) => {

  db.get(
    `SELECT message FROM message_store WHERE id = 1`,
    (err, row) => {

      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }

      if (!row) {
        return res.send('No message');
      }

      res.send(row.message);
    }
  );
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});