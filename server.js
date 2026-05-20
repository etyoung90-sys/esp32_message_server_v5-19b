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

  // Current active message
  db.run(`
    CREATE TABLE IF NOT EXISTS message_store (
      id INTEGER PRIMARY KEY,
      message TEXT
    )
  `);

  // Message history table
  db.run(`
    CREATE TABLE IF NOT EXISTS message_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure current message row exists
  db.run(`
    INSERT OR IGNORE INTO message_store (id, message)
    VALUES (1, 'HONK! No message found...')
  `);
});

// ---------------- WEB PAGE ----------------
app.get('/', (req, res) => {

  db.get(
    `SELECT message FROM message_store WHERE id = 1`,
    (err, currentRow) => {

      const currentMessage = currentRow
        ? currentRow.message
        : '';

      db.all(
        `
        SELECT *
        FROM message_history
        ORDER BY timestamp DESC
        LIMIT 20
        `,
        (historyErr, rows) => {

          let historyHTML = '';

          rows.forEach(row => {

            historyHTML += `
              <div style="
                padding:10px;
                margin-bottom:10px;
                background:#f5f5f5;
                border-radius:8px;
              ">

                <div style="
                  font-size:12px;
                  color:gray;
                  margin-bottom:5px;
                ">
                  ${row.timestamp}
                </div>

                <div>
                  ${row.message}
                </div>

              </div>
            `;
          });

          res.send(`
            <html>

            <body style="
              font-family:sans-serif;
              padding:40px;
              max-width:700px;
            ">

              <h1>ESP32 Message Controller</h1>

              <h2>Current Message</h2>

              <div style="
                padding:15px;
                background:#f0f0f0;
                border-radius:8px;
                margin-bottom:30px;
              ">
                ${currentMessage}
              </div>

              <form method="POST" action="/update">

                <textarea
                  name="message"
                  rows="5"
                  style="
                    width:100%;
                    padding:10px;
                    font-size:16px;
                  "
                  placeholder="Enter message..."
                ></textarea>

                <br><br>

                <button
                  type="submit"
                  style="
                    padding:12px 20px;
                    font-size:16px;
                  "
                >
                  Send Message
                </button>

              </form>

              <hr style="margin:40px 0;">

              <h2>Message History</h2>

              ${historyHTML}

            </body>
            </html>
          `);
        }
      );
    }
  );
});

// ---------------- UPDATE MESSAGE ----------------
app.post('/update', (req, res) => {

  const newMessage = req.body.message || '';

  // Update current active message
  db.run(
    `UPDATE message_store SET message = ? WHERE id = 1`,
    [newMessage],
    (err) => {

      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }

      // Save message to history table
      db.run(
        `INSERT INTO message_history (message) VALUES (?)`,
        [newMessage],
        (historyErr) => {

          if (historyErr) {
            console.error(historyErr);
          }

          console.log('Message updated:', newMessage);

          res.redirect('/');
        }
      );
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