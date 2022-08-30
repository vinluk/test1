const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
 
const port = 1337;
const app = express();
 
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
 
app.listen(process.env.PORT || port, () =>{
    console.log("Server is running on port "+port+"...");
});
 
const Promise = require('bluebird');
require("date-format-lite");
 
const mysql = require('promise-mysql');

async function serverСonfig() {

    const db = await mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'etechme$',
        database: 'gantt_howto_node'
    });

	app.get("/pdf1", (req, res) => {
        console.log("PDFing");
		
		const PDFDocument = require('pdfkit');
		const fs = require('fs');
		
		var pdfDoc = new PDFDocument;
		pdfDoc.pipe(fs.createWriteStream('SampleDocument.pdf'));

		pdfDoc.text("From Mon-Sat we will have a 10% discount on selected items!", 150, 150);
		pdfDoc
			.fillColor('red')
			.fontSize(17)
			.text("20%", 305, 150);

		pdfDoc.end();

    });

	app.get("/barcode1", (req, res) => {
        console.log("barcoding");
		
		const bwipjs = require('bwip-js');

		bwipjs.toBuffer({
				bcid: 'ean13',
				text: '0978020122222',
				scale: 3,
				height: 10,
				includetext: true,
				textxalign: 'center',
				textsize: 13
			}, function (err, png) {
				if (err) {
					// `err` may be a string or Error object
					res.status(200).send("code error");
				} else {
					res.type('png');
      				res.status(200).send(png);
				}
			});
    });

	app.get("/tasks", (req, res) => {
        Promise.all([
            db.query("SELECT * FROM gantt_tasks")
        ]).then(results => {
			//res.send(JSON.stringify(results));
			res.send({
				
				data: results[0]
				
                
            });
 
        }).catch(error => {
            console.log("exceiption!");
        });
    });
	
    app.get("/data", (req, res) => {
        Promise.all([
            db.query("SELECT * FROM gantt_tasks"),
            db.query("SELECT * FROM gantt_links")
        ]).then(results => {
            let tasks = results[0],
                links = results[1];
 
            for (let i = 0; i < tasks.length; i++) {
              tasks[i].start_date = tasks[i].start_date.format("YYYY-MM-DD hh:mm:ss");
              tasks[i].open = true;
            }
 
            res.send({
                data: tasks,
                collections: { links: links }
            });
 
        }).catch(error => {
            sendResponse(res, "error", null, error);
        });
    });
 
    function sendResponse(res, action, tid, error) {
 
        if (action == "error")
            console.log(error);
 
        let result = {
            action: action
        };
        if (tid !== undefined && tid !== null)
            result.tid = tid;
 
        res.send(result);
    }
	
	// add a new task
	app.post("/data/task", (req, res) => {
		let task = getTask(req.body);
	 
		db.query("INSERT INTO gantt_tasks(text, start_date, duration, progress, parent)"
			+ " VALUES (?,?,?,?,?)",
			[task.text, task.start_date, task.duration, task.progress, task.parent])
		.then(result => {
			sendResponse(res, "inserted", result.insertId);
		})
		.catch(error => {
			sendResponse(res, "error", null, error);
		});
	});
	 
	// update a task
	app.put("/data/task/:id", (req, res) => {
		let sid = req.params.id,
			task = getTask(req.body);
	 
		db.query("UPDATE gantt_tasks SET text = ?, start_date = ?, "
			+ "duration = ?, progress = ?, parent = ? WHERE id = ?",
			[task.text, task.start_date, task.duration, task.progress, task.parent, sid])
		.then(result => {
			sendResponse(res, "updated");
		})
		.catch(error => {
			sendResponse(res, "error", null, error);
		});
	});
	 
	 
	// delete a task
	app.delete("/data/task/:id", (req, res) => {
		let sid = req.params.id;
		db.query("DELETE FROM gantt_tasks WHERE id = ?", [sid])
		.then(result => {
			sendResponse(res, "deleted");
		})
		.catch(error => {
			sendResponse(res, "error", null, error);
		});
	});
	 
	// add a link
	app.post("/data/link", (req, res) => {
		let link = getLink(req.body);
	 
		db.query("INSERT INTO gantt_links(source, target, type) VALUES (?,?,?)",
			[link.source, link.target, link.type])
		.then(result => {
			sendResponse(res, "inserted", result.insertId);
		})
		.catch(error => {
			sendResponse(res, "error", null, error);
		});
	});
	 
	// update a link
	app.put("/data/link/:id", (req, res) => {
		let sid = req.params.id,
			link = getLink(req.body);
	 
		db.query("UPDATE gantt_links SET source = ?, target = ?, type = ? WHERE id = ?",
			[link.source, link.target, link.type, sid])
		.then(result => {
			sendResponse(res, "updated");
		})
		.catch(error => {
			sendResponse(res, "error", null, error);
		});
	});
	 
	// delete a link
	app.delete("/data/link/:id", (req, res) => {
		let sid = req.params.id;
		db.query("DELETE FROM gantt_links WHERE id = ?", [sid])
		.then(result => {
			sendResponse(res, "deleted");
		})
		.catch(error => {
			sendResponse(res, "error", null, error);
		});
	});
	 
	 
	function getTask(data) {
		return {
			text: data.text,
			start_date: data.start_date.date("YYYY-MM-DD"),
			duration: data.duration,
			progress: data.progress || 0,
			parent: data.parent
		};
	}
	 
	function getLink(data) {
		return {
			source: data.source,
			target: data.target,
			type: data.type
		};
	}
};
serverСonfig();