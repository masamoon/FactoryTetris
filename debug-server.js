const http = require('http');
const fs = require('fs');
const path = require('path');

let PORT = 8085;
const MAX_PORT_ATTEMPTS = 5;

function startServer(port, attemptCount = 0) {
    const server = http.createServer((req, res) => {
        // Serve the debug.html file
        if (req.url === '/' || req.url === '/index.html' || req.url === '/debug.html') {
            fs.readFile(path.join(__dirname, 'debug.html'), (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading debug.html');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            });
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use.`);
            
            // If we've tried too many ports, just exit
            if (attemptCount >= MAX_PORT_ATTEMPTS) {
                console.error(`Failed to find an available port after ${MAX_PORT_ATTEMPTS} attempts. Please close other processes using ports in the range.`);
                process.exit(1);
            }
            
            // Try the next port
            const nextPort = port + 1;
            console.log(`Trying port ${nextPort}...`);
            startServer(nextPort, attemptCount + 1);
        } else {
            // For other errors, just log and exit
            console.error('Server error:', e);
            process.exit(1);
        }
    });

    server.listen(port, () => {
        console.log(`Debug server running at http://localhost:${port}/`);
        
        // Update the debug.html file with the correct port
        try {
            const debugHtmlPath = path.join(__dirname, 'debug.html');
            let content = fs.readFileSync(debugHtmlPath, 'utf8');
            // Replace any localhost:8085 with the actual port
            content = content.replace(/localhost:8085/g, `localhost:${port}`);
            fs.writeFileSync(debugHtmlPath, content);
            console.log(`Updated debug.html with port ${port}`);
        } catch (err) {
            console.warn('Could not update debug.html with the correct port:', err);
        }
    });
}

// Start the server with the initial port
startServer(PORT); 