# Asynchronous JavaScript and Node.js Event Loop

A comprehensive guide to understanding asynchronous programming in Node.js, from the event loop architecture to modern async/await patterns.

---

## Table of Contents

1. [Introduction: Why Async Matters](#introduction-why-async-matters)
2. [Node.js Single-Threaded Architecture](#nodejs-single-threaded-architecture)
3. [Callbacks: The Foundation](#callbacks-the-foundation)
4. [Promises: The Game Changer](#promises-the-game-changer)
5. [Async/Await: Modern JavaScript](#asyncawait-modern-javascript)
6. [Express and Async: The asyncHandler Pattern](#express-and-async-the-asynchandler-pattern)
7. [Common Async Patterns in This Project](#common-async-patterns-in-this-project)
8. [Practical Examples & Exercises](#practical-examples--exercises)
9. [Common Pitfalls & Best Practices](#common-pitfalls--best-practices)
10. [Debugging Async Code](#debugging-async-code)
11. [Testing Async Code](#testing-async-code)
12. [Further Reading & Resources](#further-reading--resources)

---

## Introduction: Why Async Matters

### The Problem: Blocking Operations

Imagine a simple web server that reads a file from disk for every request:

```javascript
// ⚠️ BAD: Synchronous (blocking) code
function handleRequest(request, response) {
    const data = readFileSync('data.txt');  // Blocks for 100ms
    response.send(data);
}
```

When this code runs, the entire server **stops** while waiting for the file to be read. During those 100 milliseconds:
- No other requests can be processed
- No other code can execute
- The CPU sits idle waiting for the disk

With 10 concurrent users, each would wait their turn:
- User 1: 0-100ms
- User 2: 100-200ms (waited 100ms)
- User 3: 200-300ms (waited 200ms)
- User 10: 900-1000ms (waited 900ms!)

### The Real-World Analogy: Restaurant Service

**Synchronous (Blocking) Approach:**
Think of a restaurant with one waiter who:
1. Takes order from table 1
2. Goes to kitchen and **waits** while food is prepared (5 minutes)
3. Returns with food to table 1
4. Only now can take order from table 2
5. Returns to kitchen and **waits** again (5 minutes)

With 10 tables, the last customer waits 50 minutes just to place their order!

**Asynchronous (Non-Blocking) Approach:**
Now imagine a smart waiter who:
1. Takes order from table 1, gives it to kitchen
2. Immediately takes order from table 2, gives it to kitchen
3. Immediately takes order from table 3, gives it to kitchen
4. When kitchen rings bell for table 1, delivers food
5. Continues taking orders while kitchen prepares multiple meals

One waiter efficiently serves 10 tables because they **don't wait idle** during cooking time.

### The Async Solution

```javascript
// ✅ GOOD: Asynchronous (non-blocking) code
async function handleRequest(request, response) {
    const data = await readFile('data.txt');  // Doesn't block!
    response.send(data);
}
```

With async code:
- While waiting for file I/O, the server processes other requests
- CPU can execute other code
- Thousands of concurrent connections become possible
- All users get responses in ~100ms (plus network time)

### Why This Matters for Web Servers

Modern web applications perform many I/O operations:
- **Database queries**: 10-100ms per query
- **External API calls**: 50-500ms per call
- **File system operations**: 1-100ms per operation
- **Network requests**: Variable, can be seconds

Without async programming, a single slow database query would freeze the entire server.

With async programming, Node.js can handle **tens of thousands** of concurrent connections on a single thread.

### What You'll Learn

By the end of this guide, you'll understand:

1. **How Node.js handles concurrency** with a single thread
2. **The evolution** from callbacks → promises → async/await
3. **How to write** robust async code with proper error handling
4. **When to run operations** sequentially vs in parallel
5. **How to apply** these patterns in Express applications

Let's start by understanding the unique architecture that makes all this possible.

---

## Node.js Single-Threaded Architecture

### What "Single-Threaded" Really Means

When we say Node.js is "single-threaded," we're specifically talking about **JavaScript execution**. Your JavaScript code runs on one thread, but that's not the whole story.

#### The Two Layers of Node.js

```
┌─────────────────────────────────────────┐
│     JavaScript Execution Thread         │
│  (Your code runs here - single thread)  │
└─────────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────────┐
│           Libuv (C++ Layer)             │
│   (Multiple worker threads for I/O)     │
└─────────────────────────────────────────┘
```

**JavaScript Layer (Single Thread):**
- Executes your JavaScript code
- Runs one function at a time
- No parallel execution of JavaScript

**Libuv Layer (Thread Pool):**
- Default: 4 worker threads
- Handles file I/O, DNS lookups, compression
- Your JavaScript doesn't run here

### Why Single-Threaded is a Strength

Traditional multi-threaded servers (like Apache with PHP) create one thread per connection:

```
Connection 1 → Thread 1 (8 MB memory)
Connection 2 → Thread 2 (8 MB memory)
Connection 3 → Thread 3 (8 MB memory)
...
Connection 1000 → Thread 1000 (8 MB memory) = 8 GB!
```

**Problems with this approach:**
- High memory usage (8 MB per thread)
- Context switching overhead (CPU switches between threads)
- Race conditions and deadlocks (threads accessing shared data)
- Limited scalability (~10,000 threads max)

**Node.js approach:**

```
1 JavaScript Thread + Event Loop
Handles 10,000+ connections with ~100 MB memory
```

**Benefits:**
- Low memory footprint
- No context switching overhead
- No race conditions (single thread)
- Scales to hundreds of thousands of connections

### The Event Loop: Heart of Node.js

The event loop is the mechanism that allows Node.js to perform non-blocking I/O operations despite JavaScript being single-threaded.

#### Event Loop Phases

The event loop runs in phases, each with its own queue of callbacks:

```
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  System operations (TCP errors, etc.)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  Internal use only
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  Incoming connections, data, etc.
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──│      close callbacks      │  socket.on('close', ...)
   └───────────────────────────┘
```

**Key Phases:**

1. **Timers**: Executes callbacks from `setTimeout()` and `setInterval()`
2. **Pending callbacks**: Executes I/O callbacks deferred from previous cycle
3. **Poll**: Retrieves new I/O events; executes I/O callbacks
4. **Check**: Executes `setImmediate()` callbacks
5. **Close callbacks**: Executes close event callbacks (`socket.on('close')`)

#### How a Request Flows Through the Event Loop

Let's trace a database query through the event loop:

```javascript
// Step 1: Your code executes (synchronous)
app.get('/users', async (req, res) => {
    console.log('Handler started');  // Executes immediately

    // Step 2: Initiate async operation
    const users = await db.query('SELECT * FROM users');
    //              ↑
    //              Database query sent to libuv
    //              JavaScript execution pauses HERE
    //              Event loop continues with other work

    // Step 3: When query completes, callback is queued
    // Step 4: Event loop picks up callback
    // Step 5: Execution resumes here
    console.log('Query completed');
    res.json(users);
});
```

**Timeline:**

```
Time    JavaScript Thread           Libuv Thread Pool
────────────────────────────────────────────────────────
0ms     Start handler execution
1ms     Send DB query              → Start DB query
2ms     Process other requests      | DB query running
3ms     Process other requests      | DB query running
4ms     Process other requests      | DB query running
...     Process other requests      | DB query running
50ms    Process other requests      ← DB query completes
51ms    Resume handler execution
52ms    Send response
```

### Call Stack, Callback Queue, and Event Loop

Understanding these three components is crucial:

#### Call Stack
The call stack tracks what function is currently executing:

```javascript
function first() {
    second();
}

function second() {
    console.log('In second');
}

first();

// Call stack during execution:
// ┌──────────────┐
// │ console.log  │  ← Currently executing
// ├──────────────┤
// │   second()   │
// ├──────────────┤
// │   first()    │
// ├──────────────┤
// │   main()     │
// └──────────────┘
```

#### Callback Queue (Task Queue)
Callbacks from async operations wait here:

```javascript
setTimeout(() => {
    console.log('Timer callback');
}, 0);

console.log('Main code');

// Output:
// Main code
// Timer callback

// Why? The setTimeout callback goes to the queue,
// and the event loop only checks the queue when the call stack is empty.
```

#### Microtask Queue
Promises and `queueMicrotask()` use a higher-priority queue:

```javascript
setTimeout(() => console.log('Timer'), 0);
Promise.resolve().then(() => console.log('Promise'));
console.log('Main');

// Output:
// Main
// Promise    ← Microtask queue has priority
// Timer      ← Then callback queue
```

#### Visual Example: Complete Flow

```javascript
console.log('1');

setTimeout(() => {
    console.log('2');
}, 0);

Promise.resolve().then(() => {
    console.log('3');
});

console.log('4');

// Execution flow:
//
// Call Stack:         Microtask Queue:    Callback Queue:
// ┌─────────┐         ┌─────────┐         ┌─────────┐
// │ main()  │         │         │         │         │
// └─────────┘         └─────────┘         └─────────┘
// Print: 1
//
// ┌─────────┐         ┌─────────┐         ┌─────────┐
// │ main()  │         │         │         │ timer() │ ← setTimeout queued
// └─────────┘         └─────────┘         └─────────┘
//
// ┌─────────┐         ┌─────────┐         ┌─────────┐
// │ main()  │         │promise()│ ← then() │ timer() │
// └─────────┘         └─────────┘         └─────────┘
// Print: 4
//
// ┌─────────┐         ┌─────────┐         ┌─────────┐
// │ Empty   │ ← Now   │promise()│         │ timer() │
// └─────────┘  check  └─────────┘         └─────────┘
//               queue
// Print: 3 (microtask has priority!)
//
// ┌─────────┐         ┌─────────┐         ┌─────────┐
// │ Empty   │         │ Empty   │         │ timer() │
// └─────────┘         └─────────┘         └─────────┘
// Print: 2
//
// Final output: 1, 4, 3, 2
```

### Libuv and the Thread Pool

While JavaScript is single-threaded, some operations run on background threads:

#### What Runs on Worker Threads (Libuv):
- File system operations (`fs.readFile`, `fs.writeFile`)
- DNS lookups (`dns.lookup`)
- Compression (zlib)
- Crypto operations
- Some native module operations

#### What Doesn't Use Thread Pool:
- Network I/O (uses OS async capabilities)
- Timers
- Most JavaScript execution

#### Example: File Reading

```javascript
const fs = require('fs').promises;

async function readMultipleFiles() {
    console.log('Starting reads...');

    // These all run on worker threads in parallel
    const [file1, file2, file3, file4, file5] = await Promise.all([
        fs.readFile('file1.txt'),  // Worker thread 1
        fs.readFile('file2.txt'),  // Worker thread 2
        fs.readFile('file3.txt'),  // Worker thread 3
        fs.readFile('file4.txt'),  // Worker thread 4
        fs.readFile('file5.txt'),  // Queued, waits for free thread
    ]);

    console.log('All reads complete');
}

// Default thread pool size: 4
// You can increase it:
process.env.UV_THREADPOOL_SIZE = 8;
```

### Real Example from This Project

Let's see how the event loop works in our server startup:

```typescript
// From src/index.ts:27-62

const startServer = async (): Promise<void> => {
    try {
        // Step 1: Synchronous - creates Express app
        const app = createApp();

        // Step 2: Start listening - async operation
        const server = app.listen(PORT, () => {
            // This callback runs when server is ready
            console.log(`🚀 Server running on port ${PORT}`);
        });

        // Step 3: Register signal handlers (async event listeners)
        const gracefulShutdown = (signal: string) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

            // Step 4: Close server - async operation
            server.close((err) => {
                if (err) {
                    console.error('❌ Error during server shutdown:', err);
                    process.exit(1);
                }
                console.log('✅ Server closed successfully');
                process.exit(0);
            });
        };

        // These handlers are added to the event loop
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Event loop starts here
startServer();
```

**What happens:**

1. `createApp()` executes synchronously
2. `app.listen()` tells OS to start listening - non-blocking
3. JavaScript continues, registers signal handlers
4. Event loop now monitors:
   - Incoming HTTP connections (poll phase)
   - Process signals like SIGTERM (signal handlers)
   - Timer callbacks
5. When connection arrives → request handler executes
6. When SIGTERM received → gracefulShutdown executes

### Key Takeaways

1. **Single-threaded JavaScript** means no parallel JS execution
2. **Event loop** enables concurrent I/O without threads
3. **Libuv thread pool** handles blocking operations
4. **Callback/microtask queues** determine execution order
5. **Non-blocking I/O** is what makes Node.js scalable

Understanding this architecture explains why:
- `await` doesn't actually "wait" (it yields to event loop)
- You can handle thousands of requests with one process
- CPU-intensive operations still block (use worker threads for those)
- I/O operations are where Node.js shines

---

## Callbacks: The Foundation

Before promises and async/await, callbacks were the only way to handle asynchronous operations in JavaScript. Understanding callbacks is essential because:

1. They're still used in many Node.js APIs
2. Promises and async/await are built on top of callback concepts
3. You'll encounter them in legacy code
4. Some APIs still require callbacks

### What is a Callback?

A callback is simply a function passed as an argument to another function, to be executed later when an operation completes.

```javascript
// Synchronous callback (executes immediately)
const numbers = [1, 2, 3, 4, 5];
numbers.forEach(function(number) {  // ← This is a callback
    console.log(number);
});

// Asynchronous callback (executes later)
setTimeout(function() {  // ← This is an async callback
    console.log('1 second later');
}, 1000);
```

### The Node.js Callback Convention

Node.js established a standard callback signature called "error-first callbacks":

```javascript
function asyncOperation(param, callback) {
    // callback signature: (error, result)
    //                      ↑       ↑
    //                      |       └─ Success data (if no error)
    //                      └───────── Error object (if error occurred)
}

// Usage:
asyncOperation('data', (error, result) => {
    if (error) {
        // Handle error
        console.error('Operation failed:', error);
        return;
    }
    // Handle success
    console.log('Operation succeeded:', result);
});
```

**Key convention rules:**

1. **First parameter is always error** (null if no error)
2. **Second parameter is result** (undefined if error occurred)
3. **Callback is last parameter** of the function

### Real Example: File System Operations

```javascript
const fs = require('fs');

// Reading a file with callbacks
fs.readFile('config.json', 'utf8', (error, data) => {
    if (error) {
        console.error('Failed to read file:', error.message);
        return;
    }

    console.log('File contents:', data);

    // Parse JSON
    try {
        const config = JSON.parse(data);
        console.log('Config loaded:', config);
    } catch (parseError) {
        console.error('Failed to parse JSON:', parseError.message);
    }
});

console.log('Read operation started...');

// Output order:
// Read operation started...
// File contents: {...}
// Config loaded: {...}
```

### The Problem: Callback Hell

As applications grow, nested callbacks become unmanageable:

```javascript
// ⚠️ Callback Hell (Pyramid of Doom)
fs.readFile('user.json', 'utf8', (err, userData) => {
    if (err) return handleError(err);

    const user = JSON.parse(userData);

    pool.query('SELECT * FROM Account WHERE Email = $1', [user.email], (err, result) => {
        if (err) return handleError(err);

        result.rows.forEach((account) => {
            fs.writeFile(`user-${account.account_id}.txt`, account.email, (err) => {
                if (err) return handleError(err);

                logger.log(`Saved account data for ${account.email}`, (err) => {
                    if (err) return handleError(err);

                    // SUCCESS! But look at this nesting...
                    // What if we need to do more operations?
                    // Code becomes unreadable and unmaintainable
                });
            });
        });
    });
});
```

**Problems with callback hell:**

1. **Readability**: Code grows horizontally, not vertically
2. **Error handling**: Must handle errors at every level
3. **Debugging**: Stack traces are difficult to follow
4. **Composition**: Hard to combine multiple async operations
5. **Maintenance**: Changes require modifying nested code

### Error Handling with Callbacks

Error handling requires discipline with callbacks:

```javascript
// ❌ BAD: Not checking for errors
fs.readFile('data.txt', 'utf8', (err, data) => {
    const parsed = JSON.parse(data);  // What if err is not null?
    console.log(parsed);
});

// ✅ GOOD: Always check error first
fs.readFile('data.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('File read error:', err);
        return;  // Don't continue if error
    }

    try {
        const parsed = JSON.parse(data);
        console.log(parsed);
    } catch (parseError) {
        console.error('JSON parse error:', parseError);
    }
});
```

### Callback Pattern Examples in Node.js Core

Many Node.js core APIs still use callbacks:

#### Server Close Callback

```javascript
// From src/index.ts:42-52
server.close((err) => {
    if (err) {
        console.error('❌ Error during server shutdown:', err);
        process.exit(1);
    }

    console.log('✅ Server closed successfully');
    console.log('👋 Goodbye!');
    process.exit(0);
});
```

#### HTTP Request

```javascript
const http = require('http');

http.get('http://api.example.com/data', (response) => {
    let data = '';

    response.on('data', (chunk) => {
        data += chunk;
    });

    response.on('end', () => {
        console.log('Response:', data);
    });

}).on('error', (err) => {
    console.error('Request failed:', err);
});
```

#### Event Emitters (Callback-like Pattern)

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Register callbacks for events
emitter.on('data', (data) => {
    console.log('Data received:', data);
});

emitter.on('error', (error) => {
    console.error('Error occurred:', error);
});

// Emit events
emitter.emit('data', { id: 1, name: 'Test' });
emitter.emit('error', new Error('Something went wrong'));
```

### Converting Callbacks to Better Patterns

You can wrap callback-based functions to use with promises:

```javascript
const fs = require('fs');
const util = require('util');

// Method 1: Using util.promisify
const readFilePromise = util.promisify(fs.readFile);

// Now you can use it with async/await
async function readConfig() {
    try {
        const data = await readFilePromise('config.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to read config:', error);
        throw error;
    }
}

// Method 2: Manual Promise wrapper
function readFileAsPromise(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (error, data) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
}

// Method 3: Node.js provides promise versions
const fs = require('fs').promises;  // ← Promise-based API

async function readConfigModern() {
    const data = await fs.readFile('config.json', 'utf8');
    return JSON.parse(data);
}
```

### When You Still Need Callbacks

Some scenarios still require callbacks:

#### Event Listeners

```javascript
// Express middleware and routes use callback-style
app.get('/health', (req, res) => {
    res.json({ message: 'Hello' });
});

// Event emitters
server.on('connection', (socket) => {
    console.log('New connection');
});

// Process events
process.on('SIGTERM', () => {
    console.log('Shutting down...');
});
```

#### Stream Processing

```javascript
const readStream = fs.createReadStream('large-file.txt');

readStream.on('data', (chunk) => {
    console.log('Chunk received:', chunk.length);
});

readStream.on('end', () => {
    console.log('File read complete');
});

readStream.on('error', (error) => {
    console.error('Read error:', error);
});
```

### Callback Best Practices

1. **Always check errors first**
   ```javascript
   callback((err, result) => {
       if (err) return handleError(err);
       // Use result
   });
   ```

2. **Use early returns to avoid nesting**
   ```javascript
   // ❌ Nested
   callback((err, result) => {
       if (!err) {
           // do something
       }
   });

   // ✅ Early return
   callback((err, result) => {
       if (err) return handleError(err);
       // do something
   });
   ```

3. **Named functions over anonymous**
   ```javascript
   // ❌ Hard to debug
   fs.readFile('data.txt', (err, data) => {
       // anonymous function
   });

   // ✅ Easier to debug (shows in stack traces)
   fs.readFile('data.txt', function readCallback(err, data) {
       // named function
   });
   ```

4. **Extract nested callbacks into separate functions**
   ```javascript
   function handleFileRead(err, data) {
       if (err) return handleError(err);
       processData(data);
   }

   function processData(data) {
       // Process data
   }

   fs.readFile('data.txt', handleFileRead);
   ```

### Why We Moved Beyond Callbacks

Callbacks were revolutionary, but they have limitations:

| Problem | Callback Solution | Promise/Async Solution |
|---------|------------------|----------------------|
| Error handling | Check at every level | Single try/catch block |
| Composition | Nested callbacks | Chain with `.then()` or sequential `await` |
| Parallel operations | Complex coordination | `Promise.all()` |
| Readability | Horizontal growth | Vertical, synchronous-looking code |
| Debugging | Multiple stack traces | Single stack trace |

Despite their limitations, callbacks are:
- Still in Node.js core APIs
- Efficient (no promise overhead)
- Necessary for event-driven patterns
- Part of JavaScript history and evolution

Understanding callbacks gives you the foundation to appreciate promises and async/await, which we'll explore next.

---

## Promises: The Game Changer

Promises revolutionized asynchronous JavaScript by providing a cleaner, more composable way to handle async operations. They solve the callback hell problem while introducing powerful new patterns.

### What is a Promise?

A Promise is an object representing the eventual completion (or failure) of an asynchronous operation.

**Think of a promise like a restaurant receipt:**
- When you order food, you get a receipt (promise)
- The receipt represents food that will arrive **later**
- Three outcomes:
  - ✅ **Fulfilled**: Food arrives as ordered
  - ❌ **Rejected**: Kitchen is out of ingredients
  - ⏳ **Pending**: Still cooking

```javascript
// A promise is an object in one of three states:
const promise = new Promise((resolve, reject) => {
    // Pending: Initial state

    setTimeout(() => {
        const success = Math.random() > 0.5;

        if (success) {
            resolve('Operation succeeded!');  // Fulfilled
        } else {
            reject(new Error('Operation failed!'));  // Rejected
        }
    }, 1000);
});
```

### Promise States

```
                    ┌──────────────┐
                    │   PENDING    │
                    │ (initial)    │
                    └───────┬──────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        ┌───────────────┐       ┌──────────────┐
        │   FULFILLED   │       │   REJECTED   │
        │  (resolved)   │       │   (error)    │
        └───────────────┘       └──────────────┘
                │                       │
                └───────────┬───────────┘
                            │
                    ┌───────▼──────┐
                    │   SETTLED    │
                    │  (finished)  │
                    └──────────────┘
```

**State transitions:**
- A promise starts in **pending** state
- Once **settled**, it cannot change states
- A promise is **fulfilled** with a value
- A promise is **rejected** with a reason (usually an Error)

### Creating Promises

#### Promise Constructor

```javascript
function delay(ms) {
    return new Promise((resolve, reject) => {
        if (ms < 0) {
            reject(new Error('Delay must be positive'));
            return;
        }

        setTimeout(() => {
            resolve(`Waited ${ms}ms`);
        }, ms);
    });
}

// Usage
delay(1000)
    .then(result => console.log(result))  // "Waited 1000ms"
    .catch(error => console.error(error));
```

#### Static Methods

```javascript
// Already resolved promise
const resolved = Promise.resolve('Immediate value');

// Already rejected promise
const rejected = Promise.reject(new Error('Immediate error'));

// Useful for ensuring a value is a promise
function ensurePromise(value) {
    return Promise.resolve(value);  // If value is promise, returns it
                                     // If not, wraps it in resolved promise
}
```

### Consuming Promises

#### The `.then()` Method

```javascript
promise
    .then(
        value => {
            // Success handler (onFulfilled)
            console.log('Success:', value);
            return value;  // Return value or another promise
        },
        error => {
            // Error handler (onRejected) - optional
            console.error('Error:', error);
        }
    );
```

#### The `.catch()` Method

```javascript
promise
    .then(value => {
        console.log('Success:', value);
        return value;
    })
    .catch(error => {
        // Catches any rejection in the chain
        console.error('Error:', error);
    });
```

#### The `.finally()` Method

```javascript
promise
    .then(value => console.log('Success:', value))
    .catch(error => console.error('Error:', error))
    .finally(() => {
        // Runs regardless of fulfillment or rejection
        console.log('Cleanup code here');
    });
```

### Chaining Promises

Promises can be chained, with each `.then()` returning a new promise:

```javascript
fetch('https://api.example.com/user/1')
    .then(response => {
        console.log('Got response');
        return response.json();  // Returns a promise
    })
    .then(user => {
        console.log('Parsed user:', user);
        return fetch(`https://api.example.com/posts?userId=${user.id}`);
    })
    .then(response => {
        console.log('Got posts response');
        return response.json();
    })
    .then(posts => {
        console.log('User posts:', posts);
        return posts.length;  // Returns a value (wrapped in resolved promise)
    })
    .then(count => {
        console.log(`User has ${count} posts`);
    })
    .catch(error => {
        // Catches errors from ANY step in the chain
        console.error('Something failed:', error);
    });
```

**Key concepts:**
1. Each `.then()` returns a new promise
2. Return value becomes the resolved value of that promise
3. Returning a promise makes the chain wait for it
4. Errors bubble down to the nearest `.catch()`

### Error Handling in Promise Chains

```javascript
Promise.resolve('Start')
    .then(value => {
        console.log(value);  // "Start"
        throw new Error('Something went wrong');
    })
    .then(value => {
        // This is skipped because previous then threw
        console.log('This will not run');
    })
    .catch(error => {
        // Catches the error from above
        console.error('Caught:', error.message);
        return 'Recovered';  // Can return a value to recover
    })
    .then(value => {
        // Chain continues after recovery
        console.log(value);  // "Recovered"
    });
```

**Error handling strategies:**

```javascript
// Strategy 1: Catch at the end (most common)
doAsyncWork()
    .then(processResult)
    .then(saveResult)
    .catch(handleError);  // Catches all errors

// Strategy 2: Catch and recover
doAsyncWork()
    .catch(error => {
        console.log('Using fallback');
        return fallbackValue;  // Continue with fallback
    })
    .then(processResult);  // Processes either result or fallback

// Strategy 3: Catch specific errors
doAsyncWork()
    .catch(error => {
        if (error.code === 'ENOENT') {
            return defaultValue;  // Specific recovery
        }
        throw error;  // Re-throw other errors
    })
    .catch(handleUnexpectedError);
```

### Promise Composition Methods

#### `Promise.all()` - Parallel Execution, Wait for All

Waits for all promises to fulfill, or rejects if any promise rejects:

```javascript
const promise1 = fetch('/api/users');
const promise2 = fetch('/api/posts');
const promise3 = fetch('/api/comments');

Promise.all([promise1, promise2, promise3])
    .then(([users, posts, comments]) => {
        console.log('All requests completed');
        console.log('Users:', users);
        console.log('Posts:', posts);
        console.log('Comments:', comments);
    })
    .catch(error => {
        // If ANY promise rejects, catch is called
        console.error('At least one request failed:', error);
    });
```

**Use cases:**
- Loading multiple independent resources
- Parallel database queries
- Batch operations where all must succeed

**Characteristics:**
- ❌ Fails fast: Rejects as soon as any promise rejects
- ⏱️ Returns when **all** promises complete
- 📦 Returns array of results in same order as input

#### `Promise.allSettled()` - Wait for All, Regardless of Outcome

Waits for all promises to settle (fulfill or reject):

```javascript
const promises = [
    fetch('/api/users'),         // Might succeed
    fetch('/api/nonexistent'),   // Might fail
    fetch('/api/posts'),         // Might succeed
];

Promise.allSettled(promises)
    .then(results => {
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`Promise ${index} succeeded:`, result.value);
            } else {
                console.log(`Promise ${index} failed:`, result.reason);
            }
        });
    });

// Example output:
// [
//   { status: 'fulfilled', value: {...} },
//   { status: 'rejected', reason: Error {...} },
//   { status: 'fulfilled', value: {...} }
// ]
```

**Use cases:**
- When you want results from all operations, even if some fail
- Logging or reporting systems
- Batch operations where failures are acceptable

#### `Promise.race()` - First to Settle Wins

Returns the result of the first promise to settle:

```javascript
const timeout = new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Timeout')), 5000);
});

const apiCall = fetch('/api/data');

Promise.race([apiCall, timeout])
    .then(result => {
        console.log('API call succeeded before timeout');
    })
    .catch(error => {
        console.error('Either API failed or timeout occurred:', error);
    });
```

**Use cases:**
- Implementing timeouts
- First response from multiple sources
- Racing between cache and network

#### `Promise.any()` - First Fulfillment Wins

Returns the first promise that fulfills (ignores rejections):

```javascript
const primary = fetch('https://api-primary.example.com/data');
const backup1 = fetch('https://api-backup1.example.com/data');
const backup2 = fetch('https://api-backup2.example.com/data');

Promise.any([primary, backup1, backup2])
    .then(result => {
        console.log('Got result from fastest successful API');
        return result.json();
    })
    .catch(error => {
        // Only fails if ALL promises reject
        console.error('All APIs failed:', error);
    });
```

**Use cases:**
- Fallback to multiple services
- Load balancing
- Redundancy strategies

### Converting Callbacks to Promises

#### Using `util.promisify()`

```javascript
const fs = require('fs');
const util = require('util');

// Promisify callback-based function
const readFilePromise = util.promisify(fs.readFile);

// Now use with promises
readFilePromise('config.json', 'utf8')
    .then(data => JSON.parse(data))
    .then(config => console.log('Config:', config))
    .catch(error => console.error('Failed:', error));
```

#### Manual Wrapping

```javascript
function readFileAsPromise(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (error, data) => {
            if (error) {
                reject(error);  // Convert error to rejection
            } else {
                resolve(data);  // Convert result to fulfillment
            }
        });
    });
}
```

### Real-World Example: Refactoring Callback Hell

**Before (Callbacks):**

```javascript
fs.readFile('user.json', 'utf8', (err, userData) => {
    if (err) return handleError(err);

    const user = JSON.parse(userData);

    pool.query('SELECT * FROM Account WHERE Email = $1', [user.email], (err, result) => {
        if (err) return handleError(err);

        async.map(result.rows, (account, callback) => {
            fs.writeFile(`user-${account.account_id}.txt`, account.email, callback);
        }, (err) => {
            if (err) return handleError(err);
            console.log('All user accounts saved!');
        });
    });
});
```

**After (Promises):**

```javascript
const fs = require('fs').promises;

fs.readFile('user.json', 'utf8')
    .then(userData => {
        const user = JSON.parse(userData);
        return pool.query('SELECT * FROM Account WHERE Email = $1', [user.email]);
    })
    .then(result => {
        const writePromises = result.rows.map(account =>
            fs.writeFile(`user-${account.account_id}.txt`, account.email)
        );
        return Promise.all(writePromises);
    })
    .then(() => {
        console.log('All user accounts saved!');
    })
    .catch(error => {
        console.error('Operation failed:', error);
    });
```

### Promise Anti-Patterns

#### Anti-Pattern 1: Nested Promises (Promise Hell)

```javascript
// ❌ BAD: Nesting promises defeats the purpose
getData()
    .then(data => {
        processData(data)
            .then(result => {
                saveData(result)
                    .then(() => {
                        console.log('Done');
                    });
            });
    });

// ✅ GOOD: Chain promises
getData()
    .then(data => processData(data))
    .then(result => saveData(result))
    .then(() => console.log('Done'))
    .catch(error => console.error(error));
```

#### Anti-Pattern 2: Not Returning Promises

```javascript
// ❌ BAD: Not returning inner promise
getData()
    .then(data => {
        processData(data)  // This promise is not returned!
            .then(result => console.log(result));
    })
    .then(() => {
        // This runs BEFORE processData completes!
        console.log('All done');
    });

// ✅ GOOD: Return the promise
getData()
    .then(data => {
        return processData(data);  // Return the promise
    })
    .then(result => {
        console.log(result);
        console.log('All done');
    });
```

#### Anti-Pattern 3: Creating Unnecessary Promises

```javascript
// ❌ BAD: Wrapping a promise in a promise
function getData() {
    return new Promise((resolve, reject) => {
        fetch('/api/data')  // fetch already returns a promise!
            .then(data => resolve(data))
            .catch(error => reject(error));
    });
}

// ✅ GOOD: Return the promise directly
function getData() {
    return fetch('/api/data');
}
```

### Promises in This Project

Our Express controllers implicitly use promises with async/await:

```typescript
// From src/controllers/authController.ts:91-165
static async login(request: IJwtRequest, response: Response): Promise<void> {
    const { email, password } = request.body;

    try {
        // Find account
        const accountResult = await pool.query(
            `SELECT
                a.Account_ID, a.FirstName, a.LastName, a.Username,
                a.Email, a.Account_Role, a.Email_Verified,
                a.Phone_Verified, a.Account_Status,
                ac.Salted_Hash, ac.Salt
            FROM Account a
            LEFT JOIN Account_Credential ac ON a.Account_ID = ac.Account_ID
            WHERE a.Email = $1`,
            [email]
        );

        if (accountResult.rowCount === 0) {
            sendError(response, 401, 'Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS);
            return;
        }

        const account = accountResult.rows[0];

        // Verify password
        if (!account.salted_hash || !verifyPassword(password, account.salt, account.salted_hash)) {
            sendError(response, 401, 'Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS);
            return;
        }

        // Generate JWT token
        const token = generateAccessToken({
            id: account.account_id,
            email: account.email,
            role: account.account_role
        });

        sendSuccess(response, {
            accessToken: token,
            user: {
                id: account.account_id,
                email: account.email,
                role: getRoleName(account.account_role)
            }
        }, 'Login successful');

    } catch (error) {
        console.error('Error during login:', error);
        sendError(response, 500, "Server error occurred during login - please contact support", ErrorCodes.SRVR_INTERNAL_ERROR);
    }
}
```

The `asyncHandler` wrapper (which we'll explore in detail later) handles the promise:

```typescript
// From src/core/middleware/errorHandler.ts:149-155
export const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (request: Request, response: Response, next: NextFunction): void => {
        Promise.resolve(handler(request, response, next)).catch(next);
        //                                                  ↑
        //                                                  Catches rejections
    };
};
```

### Key Takeaways

1. **Promises solve callback hell** with chainable `.then()`
2. **Three states**: pending, fulfilled, rejected
3. **Error handling** is cleaner with `.catch()`
4. **Composition methods** enable powerful patterns:
   - `Promise.all()` for parallel execution
   - `Promise.race()` for timeouts
   - `Promise.allSettled()` for batch operations
5. **Promises are the foundation** for async/await syntax

Next, we'll see how async/await provides an even cleaner syntax built on top of promises.

---

## Async/Await: Modern JavaScript

Async/await is syntactic sugar built on top of promises, making asynchronous code look and behave more like synchronous code. It's the modern, preferred way to handle async operations in JavaScript.

### What Async/Await Does

Async/await doesn't add new functionality—it makes promises easier to read and write:

```javascript
// Promises (still valid and useful)
function getUserData() {
    return fetchUser()
        .then(user => {
            return fetchPosts(user.id);
        })
        .then(posts => {
            return processPosts(posts);
        })
        .catch(error => {
            console.error('Error:', error);
            throw error;
        });
}

// Async/Await (same behavior, more readable)
async function getUserData() {
    try {
        const user = await fetchUser();
        const posts = await fetchPosts(user.id);
        const processed = await processPosts(posts);
        return processed;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
```

Both versions do **exactly the same thing**, but async/await is:
- More readable (looks synchronous)
- Easier to debug (better stack traces)
- Simpler error handling (try/catch)
- Less indentation

### The `async` Keyword

The `async` keyword declares a function that returns a promise:

```javascript
// These are equivalent:

// Async function
async function getData() {
    return 'Hello';
}

// Regular function returning a promise
function getData() {
    return Promise.resolve('Hello');
}

// Both return Promise<string>
getData().then(value => console.log(value));  // "Hello"
```

**Key properties of async functions:**

1. **Always returns a promise**
   ```javascript
   async function example() {
       return 42;  // Returns Promise.resolve(42)
   }

   example().then(value => console.log(value));  // 42
   ```

2. **Automatically wraps return values**
   ```javascript
   async function explicit() {
       return Promise.resolve('value');  // Returns promise
   }

   async function implicit() {
       return 'value';  // Also returns promise (auto-wrapped)
   }

   // Both work the same way
   ```

3. **Thrown errors become rejections**
   ```javascript
   async function willReject() {
       throw new Error('Oops');  // Returns Promise.reject(Error('Oops'))
   }

   willReject().catch(error => console.error(error));
   ```

### The `await` Keyword

The `await` keyword pauses async function execution until a promise settles:

```javascript
async function example() {
    console.log('1: Start');

    const result = await someAsyncOperation();
    //            ↑
    //            Pauses here until promise resolves
    //            Other code can run during this time

    console.log('2: Got result:', result);
    return result;
}
```

**What happens with `await`:**

```javascript
async function fetchUserData() {
    console.log('Starting fetch...');

    // Without await
    const promise = fetch('/api/user');
    console.log(promise);  // Promise { <pending> }

    // With await
    const response = await fetch('/api/user');
    console.log(response);  // Response object (promise is resolved)

    const data = await response.json();
    console.log(data);  // Parsed JSON data

    return data;
}
```

**Rules for `await`:**

1. **Only in async functions**
   ```javascript
   // ❌ ERROR: await is only valid in async functions
   function invalid() {
       const data = await fetchData();
   }

   // ✅ CORRECT
   async function valid() {
       const data = await fetchData();
   }
   ```

2. **Top-level await** (Node.js 14+, ES modules only)
   ```javascript
   // In ES modules (.mjs or "type": "module" in package.json)
   const data = await fetchData();  // Valid at top level!
   console.log(data);
   ```

3. **Can await any value**
   ```javascript
   // Awaiting a non-promise just returns the value
   const value = await 42;  // Returns 42 immediately

   // Useful for consistent async handling
   async function maybeAsync(useAsync) {
       const result = await (useAsync ? asyncOp() : syncOp());
       return result;
   }
   ```

### Error Handling with Try/Catch

Async/await makes error handling more intuitive:

```javascript
async function handleRequest() {
    try {
        const user = await fetchUser();
        const posts = await fetchPosts(user.id);
        const processed = await processPosts(posts);
        return processed;
    } catch (error) {
        // Catches errors from ANY await in the try block
        console.error('Something failed:', error);

        // Can handle specific errors
        if (error.code === 'USER_NOT_FOUND') {
            return createDefaultUser();
        }

        // Re-throw if can't handle
        throw error;
    } finally {
        // Always runs (like .finally() on promises)
        console.log('Cleanup code here');
    }
}
```

**Multiple catch blocks:**

```javascript
async function complexOperation() {
    try {
        const data = await riskyOperation();
        return data;
    } catch (error) {
        if (error.code === 'TIMEOUT') {
            console.log('Operation timed out, retrying...');
            return await riskyOperation();  // Retry
        }

        if (error.code === 'NETWORK') {
            console.log('Network error, using cache');
            return getCachedData();
        }

        // Unexpected error
        console.error('Unexpected error:', error);
        throw error;  // Propagate
    }
}
```

### Sequential vs Parallel Execution

One of the most important async/await concepts:

#### Sequential Execution (Slower)

```javascript
async function sequential() {
    console.time('sequential');

    const user = await fetchUser();      // Wait 100ms
    const posts = await fetchPosts();    // Wait 100ms
    const comments = await fetchComments();  // Wait 100ms

    console.timeEnd('sequential');  // ~300ms total
    return { user, posts, comments };
}
```

Each `await` waits for the previous one to complete. Total time: **300ms**.

#### Parallel Execution (Faster)

```javascript
async function parallel() {
    console.time('parallel');

    // Start all operations at once (don't await yet)
    const userPromise = fetchUser();
    const postsPromise = fetchPosts();
    const commentsPromise = fetchComments();

    // Now wait for all to complete
    const user = await userPromise;
    const posts = await postsPromise;
    const comments = await commentsPromise;

    console.timeEnd('parallel');  // ~100ms total
    return { user, posts, comments };
}
```

All operations start simultaneously. Total time: **100ms** (longest operation).

#### Using Promise.all() for Parallel Execution

```javascript
async function parallelWithPromiseAll() {
    console.time('parallel');

    const [user, posts, comments] = await Promise.all([
        fetchUser(),
        fetchPosts(),
        fetchComments()
    ]);

    console.timeEnd('parallel');  // ~100ms total
    return { user, posts, comments };
}
```

This is the cleanest way to run multiple async operations in parallel.

#### When to Use Sequential vs Parallel

**Use Sequential When:**
- Operations depend on each other
- You need result from first operation for second

```javascript
async function dependent() {
    const user = await fetchUser(userId);
    const posts = await fetchPosts(user.id);  // Needs user.id!
    return posts;
}
```

**Use Parallel When:**
- Operations are independent
- You want to minimize total time

```javascript
async function independent() {
    const [users, products, settings] = await Promise.all([
        fetchUsers(),
        fetchProducts(),
        fetchSettings()
    ]);
    return { users, products, settings };
}
```

### Real Examples from This Project

#### Simple Async Controller

```typescript
// From src/controllers/authController.ts:26-86
static async register(request: IJwtRequest, response: Response): Promise<void> {
    const { firstname, lastname, email, password, username, phone } = request.body;

    try {
        // Check if user already exists
        const userExists = await validateUserUniqueness(
            { email, username, phone },
            response
        );
        if (userExists) return;

        // Execute registration transaction
        await executeTransactionWithResponse(
            async (client) => {
                // Create account with role 1 (user)
                const insertAccountResult = await client.query(
                    `INSERT INTO Account
                     (FirstName, LastName, Username, Email, Phone, Account_Role, Email_Verified, Phone_Verified, Account_Status)
                     VALUES ($1, $2, $3, $4, $5, 1, FALSE, FALSE, 'pending')
                     RETURNING Account_ID`,
                    [firstname, lastname, username, email, phone]
                );

                const accountId = insertAccountResult.rows[0].account_id;

                // Generate salt and hash for password
                const salt = generateSalt();
                const saltedHash = generateHash(password, salt);

                // Store credentials
                await client.query(
                    'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
                    [accountId, saltedHash, salt]
                );

                // Generate JWT token
                const token = generateAccessToken({
                    id: accountId,
                    email,
                    role: 1
                });

                return {
                    accessToken: token,
                    user: { id: accountId, email, name: firstname }
                };
            },
            response,
            'User registration successful',
            'Registration failed'
        );
    } catch (error) {
        console.error('Error during registration:', error);
        sendError(response, 500, "Server error occurred during registration - please contact support", ErrorCodes.SRVR_INTERNAL_ERROR);
    }
}
```

This function:
1. Is declared `async` (returns `Promise<void>`)
2. Uses `await` to perform async database query
3. Has explicit try/catch for error handling

#### Complex Async Controller with Validation

```typescript
// From src/controllers/authController.ts:91-165 (login with validation)
static async login(request: IJwtRequest, response: Response): Promise<void> {
    const { email, password } = request.body;

    try {
        // Check if account exists
        const accountResult = await pool.query(
            `SELECT
                a.Account_ID, a.FirstName, a.Email, a.Account_Role,
                a.Account_Status, ac.Salted_Hash, ac.Salt
            FROM Account a
            LEFT JOIN Account_Credential ac ON a.Account_ID = ac.Account_ID
            WHERE a.Email = $1`,
            [email]
        );

        if (accountResult.rowCount === 0) {
            sendError(response, 401, 'Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS);
            return;
        }

        const account = accountResult.rows[0];

        // Check account status
        if (account.account_status === 'suspended') {
            sendError(response, 403, 'Account is suspended', ErrorCodes.AUTH_ACCOUNT_SUSPENDED);
            return;
        }

        // Verify password
        if (!account.salted_hash || !verifyPassword(password, account.salt, account.salted_hash)) {
            sendError(response, 401, 'Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS);
            return;
        }

        // Generate JWT token
        const token = generateAccessToken({
            id: account.account_id,
            email: account.email,
            role: account.account_role
        });

        sendSuccess(
            response,
            {
                accessToken: token,
                user: {
                    id: account.account_id,
                    email: account.email,
                    name: account.firstname
                }
            },
            'Login successful'
        );

    } catch (error) {
        console.error('Error during login:', error);
        sendError(response, 500, "Server error occurred during login - please contact support", ErrorCodes.SRVR_INTERNAL_ERROR);
    }
}
```

### Async/Await with Express Middleware

Express middleware can be async:

```typescript
// Async middleware example
app.use(async (req, res, next) => {
    try {
        // Authenticate user
        const token = req.headers.authorization;
        const user = await verifyToken(token);

        // Add user to request
        req.user = user;

        next();  // Continue to next middleware
    } catch (error) {
        next(error);  // Pass error to error handler
    }
});
```

**Important:** In Express, you must:
1. Call `next()` to continue
2. Call `next(error)` to pass errors
3. Use asyncHandler wrapper (covered next section)

### Async Arrow Functions

All the async function syntaxes:

```typescript
// Regular async function
async function fetchData() {
    return await getData();
}

// Async arrow function (common in Express)
const fetchData = async () => {
    return await getData();
};

// Async method in class
class DataService {
    async fetchData() {
        return await getData();
    }
}

// Async IIFE (Immediately Invoked Function Expression)
(async () => {
    const data = await fetchData();
    console.log(data);
})();
```

### Async Iteration

You can iterate over async operations:

```javascript
// For-await-of loop
async function processFiles(filenames) {
    for (const filename of filenames) {
        const content = await readFile(filename);
        await processContent(content);
    }
}

// Async generators
async function* generateSequence() {
    for (let i = 0; i < 5; i++) {
        await delay(1000);
        yield i;
    }
}

// Usage
(async () => {
    for await (const num of generateSequence()) {
        console.log(num);  // Logs 0, 1, 2, 3, 4 with 1s delay
    }
})();
```

### Converting Promise Chains to Async/Await

**Promise chain:**

```javascript
function getUser(userId) {
    return fetchUser(userId)
        .then(user => {
            return fetchProfile(user.profileId);
        })
        .then(profile => {
            return fetchSettings(profile.settingsId);
        })
        .then(settings => {
            return { user, profile, settings };
        })
        .catch(error => {
            console.error('Error:', error);
            throw error;
        });
}
```

**Async/await:**

```javascript
async function getUser(userId) {
    try {
        const user = await fetchUser(userId);
        const profile = await fetchProfile(user.profileId);
        const settings = await fetchSettings(profile.settingsId);
        return { user, profile, settings };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
```

Much cleaner and easier to understand!

### Common Patterns

#### Pattern 1: Conditional Async Operations

```javascript
async function getUserData(userId, includePosts = false) {
    const user = await fetchUser(userId);

    if (includePosts) {
        user.posts = await fetchPosts(userId);
    }

    return user;
}
```

#### Pattern 2: Async Array Operations

```javascript
// ❌ BAD: forEach doesn't wait
async function processUsers(userIds) {
    userIds.forEach(async (id) => {
        const user = await fetchUser(id);  // These run, but we don't wait
        await saveUser(user);
    });
    console.log('Done');  // Logs immediately!
}

// ✅ GOOD: Use for-of
async function processUsers(userIds) {
    for (const id of userIds) {
        const user = await fetchUser(id);
        await saveUser(user);
    }
    console.log('Done');  // Logs after all users processed
}

// ✅ GOOD: Use Promise.all() for parallel
async function processUsersParallel(userIds) {
    const promises = userIds.map(async (id) => {
        const user = await fetchUser(id);
        return saveUser(user);
    });
    await Promise.all(promises);
    console.log('Done');  // Logs after all users processed
}
```

#### Pattern 3: Async Retry Logic

```javascript
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;  // Last attempt

            const delay = Math.pow(2, i) * 1000;  // Exponential backoff
            console.log(`Retry ${i + 1}/${retries} after ${delay}ms`);
            await sleep(delay);
        }
    }
}
```

#### Pattern 4: Async Timeouts

```javascript
function timeout(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), ms);
    });
}

async function fetchWithTimeout(url, ms = 5000) {
    try {
        const result = await Promise.race([
            fetch(url),
            timeout(ms)
        ]);
        return result;
    } catch (error) {
        if (error.message === 'Timeout') {
            console.error(`Request timed out after ${ms}ms`);
        }
        throw error;
    }
}
```

### Key Takeaways

1. **`async` functions always return promises**
2. **`await` pauses execution** until promise resolves
3. **Try/catch handles errors** cleanly
4. **Sequential vs parallel** matters for performance
5. **Use `Promise.all()`** for parallel operations
6. **Async/await is syntactic sugar** built on promises
7. **Makes asynchronous code** look synchronous

Next, we'll explore how Express handles async functions with the `asyncHandler` pattern.

---

## Express and Async: The asyncHandler Pattern

Express was created before promises and async/await became standard in JavaScript. This creates a specific problem: Express doesn't automatically catch errors from async route handlers.

### The Problem: Unhandled Promise Rejections

Consider this Express route with an async handler:

```javascript
// ⚠️ PROBLEM: Express doesn't catch async errors
app.get('/user/:id', async (req, res) => {
    const user = await db.findUser(req.params.id);  // What if this throws?
    res.json(user);
});

// If db.findUser() throws an error:
// 1. The promise rejects
// 2. Express doesn't catch it
// 3. Request hangs (no response sent)
// 4. Node.js logs: UnhandledPromiseRejectionWarning
```

**What happens:**
- Client never gets a response (request timeout)
- Server logs unhandled rejection warning
- Server might crash in future Node.js versions

### Why Express Doesn't Catch Async Errors

Express expects route handlers to either:
1. Send a response (`res.send()`, `res.json()`, etc.)
2. Call `next(error)` to pass errors to error middleware

But async functions return promises, and Express doesn't know to:
- Wait for the promise to resolve
- Catch rejections and call `next(error)`

```javascript
// What Express sees:
app.get('/user', async (req, res) => {
    // Returns a Promise
    // Express doesn't await it or catch rejections!
});

// Express immediately moves on to next middleware
// The promise is floating, unhandled
```

### Solution 1: Manual Error Handling (Tedious)

You could wrap every async route in try/catch:

```javascript
// ❌ TEDIOUS: Manual try/catch everywhere
app.get('/user/:id', async (req, res, next) => {
    try {
        const user = await db.findUser(req.params.id);
        res.json(user);
    } catch (error) {
        next(error);  // Pass to error middleware
    }
});

app.get('/posts', async (req, res, next) => {
    try {
        const posts = await db.findPosts();
        res.json(posts);
    } catch (error) {
        next(error);
    }
});

// This gets repetitive fast...
// Plus, it's easy to forget
```

### Solution 2: The asyncHandler Wrapper Pattern

A better approach: wrap async handlers to automatically catch errors.

#### Basic Implementation

```typescript
// From src/core/middleware/errorHandler.ts:149-155
export const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (request: Request, response: Response, next: NextFunction): void => {
        Promise.resolve(handler(request, response, next)).catch(next);
    };
};
```

**How it works:**

1. Takes an async handler function
2. Returns a new function that Express calls
3. Executes the handler and gets a promise
4. `.catch(next)` catches any rejection
5. Passes error to `next()` for error middleware

#### Detailed Breakdown

```typescript
export const asyncHandler = (
    // 1. Takes async handler as parameter
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    // 2. Returns a new function (this is what Express calls)
    return (request: Request, response: Response, next: NextFunction): void => {
        // 3. Execute the handler
        //    Promise.resolve() ensures we have a promise (even if handler doesn't return one)
        Promise.resolve(handler(request, response, next))
            // 4. If promise rejects, pass error to next()
            .catch(next);
            //     ↑
            //     Equivalent to: .catch(error => next(error))
    };
};
```

**Visual flow:**

```
User Request
     ↓
Express Router
     ↓
asyncHandler wrapper
     ↓
Your async handler
     ↓
Promise returned
     ↓
   Success? → Send response
     ↓
   Rejection? → .catch(next)
     ↓
Error Middleware
     ↓
Error Response
```

### Using asyncHandler in Routes

#### Basic Usage

```typescript
// Without asyncHandler (dangerous)
app.get('/user/:id', async (req, res) => {
    const user = await db.findUser(req.params.id);
    res.json(user);
});

// With asyncHandler (safe)
app.get('/user/:id', asyncHandler(async (req, res) => {
    const user = await db.findUser(req.params.id);
    res.json(user);
}));
```

#### Examples from This Project

```typescript
// From src/controllers/authController.ts (getUserProfile example)
static async getUserProfile(request: IJwtRequest, response: Response): Promise<void> {
    try {
        const { id } = request.params;

        const accountResult = await pool.query(
            `SELECT Account_ID, FirstName, LastName, Email, Username, Account_Role
             FROM Account WHERE Account_ID = $1`,
            [id]
        );

        if (accountResult.rowCount === 0) {
            sendError(response, 404, "User not found", ErrorCodes.AUTH_USER_NOT_FOUND);
            return;
        }

        const account = accountResult.rows[0];

        sendSuccess(
            response,
            {
                user: {
                    id: account.account_id,
                    firstname: account.firstname,
                    lastname: account.lastname,
                    email: account.email,
                    username: account.username,
                    role: account.account_role
                }
            },
            `Retrieved user profile for '${account.email}'`
        );

    } catch (error) {
        console.error('Error getting user profile:', error);
        sendError(response, 500, "Server error occurred while retrieving user - please contact support", ErrorCodes.SRVR_INTERNAL_ERROR);
    }
};

// From src/controllers/authController.ts (updateUserProfile example)
static async updateUserProfile(request: IJwtRequest, response: Response): Promise<void> {
    try {
        const { id } = request.params;
        const { firstname, lastname, phone } = request.body;

        // Check if account exists
        const existingAccount = await pool.query('SELECT * FROM Account WHERE Account_ID = $1', [id]);
        if (existingAccount.rows.length === 0) {
            sendError(response, 404, "User not found", ErrorCodes.AUTH_USER_NOT_FOUND);
            return;
        }

        // Update the account
        const result = await pool.query(
            'UPDATE Account SET FirstName = $2, LastName = $3, Phone = $4 WHERE Account_ID = $1 RETURNING *',
            [id, firstname, lastname, phone]
        );

        const updatedAccount = result.rows[0];

        sendSuccess(
            response,
            {
                user: {
                    id: updatedAccount.account_id,
                    firstname: updatedAccount.firstname,
                    lastname: updatedAccount.lastname,
                    email: updatedAccount.email,
                    phone: updatedAccount.phone
                }
            },
            "User profile updated successfully"
        );

    } catch (error) {
        console.error('Error updating user profile:', error);
        sendError(response, 500, "Server error occurred while updating user - please contact support", ErrorCodes.SRVR_INTERNAL_ERROR);
    }
};
```

### How Errors Flow Through asyncHandler

```typescript
// Example with error
export const getUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Scenario 1: Database throws error
    const user = await db.findUser(req.params.id);
    //                              ↑
    //                              Throws Error: "User not found"
    //                              Promise rejects
    //                              asyncHandler catches it
    //                              Calls next(error)
    //                              Error middleware handles it

    res.json(user);  // This line never runs
});

// Error flows to:
export const errorHandler = (
    error: Error | AppError,
    request: Request,
    response: Response,
    next: NextFunction
): void => {
    // Format and send error response
    response.status(statusCode).json({
        success: false,
        message: error.message,
        code: ErrorCodes.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
    });
};
```

### Advanced Error Handling

You can still throw custom errors in async handlers:

```typescript
export const getUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;

    // Validate input
    if (!userId) {
        throw new AppError(
            'User ID is required',
            400,
            ErrorCodes.BAD_REQUEST
        );
    }

    const user = await db.findUser(userId);

    if (!user) {
        throw new AppError(
            `User ${userId} not found`,
            404,
            ErrorCodes.NOT_FOUND
        );
    }

    res.json(user);
});
```

The `AppError` class from this project:

```typescript
// From src/core/middleware/errorHandler.ts:20-39
export class AppError extends Error {
    public statusCode: number;
    public errorCode: ErrorCodes;
    public isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        errorCode: ErrorCodes = ErrorCodes.INTERNAL_ERROR,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;

        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
```

### Alternative Approaches

#### Option 1: express-async-errors Package

```javascript
// Install: npm install express-async-errors

// At top of your app (before routes)
require('express-async-errors');

// Now async errors are automatically caught
app.get('/user/:id', async (req, res) => {
    const user = await db.findUser(req.params.id);
    res.json(user);  // No wrapper needed!
});
```

**Pros:**
- No wrapper needed
- Works automatically

**Cons:**
- Adds magic (harder to understand)
- Another dependency
- Less explicit

#### Option 2: Express 5 (Future)

Express 5 (still in beta) will handle async errors natively:

```javascript
// In Express 5 (when released)
app.get('/user/:id', async (req, res) => {
    const user = await db.findUser(req.params.id);
    res.json(user);  // Async errors caught automatically
});
```

### Best Practices

1. **Always use asyncHandler** for async routes
   ```typescript
   // ✅ GOOD
   export const handler = asyncHandler(async (req, res) => {
       // async code
   });
   ```

2. **Throw meaningful errors**
   ```typescript
   if (!user) {
       throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
   }
   ```

3. **Don't mix callback and async patterns**
   ```typescript
   // ❌ BAD: Mixing patterns
   asyncHandler(async (req, res, next) => {
       db.query('SELECT *', (err, results) => {  // Callback style
           if (err) return next(err);
           res.json(results);
       });
   });

   // ✅ GOOD: Use promises/async consistently
   asyncHandler(async (req, res) => {
       const results = await db.query('SELECT *');  // Promise style
       res.json(results);
   });
   ```

4. **Let errors propagate**
   ```typescript
   // ❌ BAD: Swallowing errors
   asyncHandler(async (req, res) => {
       try {
           const user = await db.findUser(req.params.id);
           res.json(user);
       } catch (error) {
           console.log('Error:', error);
           // No re-throw or response!
       }
   });

   // ✅ GOOD: Let asyncHandler catch
   asyncHandler(async (req, res) => {
       const user = await db.findUser(req.params.id);
       res.json(user);
       // Errors automatically propagate to error handler
   });
   ```

### Testing asyncHandler

You can test that errors are properly caught:

```typescript
// Test that asyncHandler catches rejections
describe('asyncHandler', () => {
    it('should catch async errors and call next()', async () => {
        const error = new Error('Test error');
        const handler = asyncHandler(async (req, res, next) => {
            throw error;
        });

        const next = jest.fn();
        const req = {} as Request;
        const res = {} as Response;

        handler(req, res, next);

        // Wait for promise to reject
        await new Promise(resolve => setImmediate(resolve));

        expect(next).toHaveBeenCalledWith(error);
    });
});
```

### Complete Error Handling Flow

```
Request
  ↓
Route Handler (wrapped with asyncHandler)
  ↓
Your async code
  ↓
Error thrown?
  ├─ Yes → asyncHandler catches → next(error)
  │           ↓
  │         Error Handler Middleware
  │           ↓
  │         Format Error Response
  │           ↓
  │         Send Error Response
  │
  └─ No → Send Success Response
```

### Key Takeaways

1. **Express doesn't catch async errors** by default
2. **asyncHandler wrapper** solves this elegantly
3. **Wraps the promise** and catches rejections
4. **Passes errors to next()** for error middleware
5. **Eliminates repetitive try/catch** blocks
6. **Makes async routes safe** without boilerplate

The asyncHandler pattern is a crucial piece of modern Express applications using async/await. It ensures that errors are properly handled without cluttering your route handlers with try/catch blocks.

---

## Common Async Patterns in This Project

This section explores async patterns used throughout the TCSS-460 Message API, with real code examples you can study and apply.

### Pattern 1: Async Middleware

Middleware functions in Express can be async to perform operations like authentication, logging, or data fetching before reaching route handlers.

#### Example: Request Logging Middleware

```typescript
// From src/core/middleware/logger.ts concept
app.use(async (req, res, next) => {
    const startTime = Date.now();

    // Log request
    console.log(`${req.method} ${req.url}`);

    // Could await async operations here
    // const userInfo = await getUserFromToken(req.headers.authorization);

    // Continue to next middleware
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });

    next();
});
```

**Key points:**
- Middleware can be async
- Must call `next()` to continue chain
- Use asyncHandler wrapper for error handling

#### Async Authentication Middleware

```typescript
const authenticateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        throw new AppError('No authorization token', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Async operation: verify token
    const user = await verifyToken(token);

    if (!user) {
        throw new AppError('Invalid token', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Add user to request
    req.user = user;

    // Continue to next middleware or route handler
    next();
});

// Usage
app.get('/protected', authenticateUser, asyncHandler(async (req, res) => {
    res.json({ message: `Hello, ${req.user.name}!` });
}));
```

### Pattern 2: Async Controllers with Error Propagation

All controllers in this project use the asyncHandler pattern to ensure errors are properly caught.

#### Simple Controller with Database Query

```typescript
// From src/controllers/authController.ts (getUsersByRole example - batch operation)
static async getUsersByRole(request: IJwtRequest, response: Response): Promise<void> {
    try {
        const role = parseInt(request.query.role as string);

        // Get users with specific role
        const usersResult = await pool.query(
            'SELECT Account_ID, FirstName, LastName, Email, Username FROM Account WHERE Account_Role = $1 ORDER BY Created_At ASC',
            [role]
        );

        if (usersResult.rows.length === 0) {
            sendError(response, 404, `No users found with role ${role}`, ErrorCodes.AUTH_NO_USERS_FOUND);
            return;
        }

        const users = usersResult.rows.map((row) => ({
            id: row.account_id,
            firstname: row.firstname,
            lastname: row.lastname,
            email: row.email,
            username: row.username
        }));

        sendSuccess(
            response,
            {
                users,
                count: users.length,
                role
            },
            `Retrieved ${users.length} user(s) with role ${role}`
        );

    } catch (error) {
        console.error('Error getting users by role:', error);
        sendError(response, 500, "Server error occurred while retrieving users - please contact support", ErrorCodes.SRVR_INTERNAL_ERROR);
    }
};
```

**Pattern breakdown:**
1. Explicit try/catch for error handling
2. `async` function with `await` for database operations
3. Multiple sequential database queries
4. Proper error responses with error codes
5. Type-safe with TypeScript interfaces

#### Controller with Validation and Database Insert

```typescript
// From src/controllers/authController.ts (deleteUserAccount example)
static async deleteUserAccount(request: IJwtRequest, response: Response): Promise<void> {
    try {
        const { id } = request.params;

        // Get account before deleting
        const accountToDelete = await pool.query(
            'SELECT Account_ID, FirstName, LastName, Email FROM Account WHERE Account_ID = $1',
            [id]
        );

        if (accountToDelete.rows.length === 0) {
            sendError(response, 404, "User not found", ErrorCodes.AUTH_USER_NOT_FOUND);
            return;
        }

        // Delete the account (cascade deletes credentials)
        await pool.query('DELETE FROM Account WHERE Account_ID = $1', [id]);

        const deletedAccount = accountToDelete.rows[0];

        sendSuccess(
            response,
            {
                deletedUser: {
                    id: deletedAccount.account_id,
                    firstname: deletedAccount.firstname,
                    lastname: deletedAccount.lastname,
                    email: deletedAccount.email
                }
            },
            `Successfully deleted account for '${deletedAccount.email}'`
        );

    } catch (error) {
        console.error('Error deleting user account:', error);
        sendError(response, 500, "Server error occurred while deleting account - please contact support", ErrorCodes.SRVR_INTERNAL_ERROR);
    }
};
```

**Pattern benefits:**
- Clear separation of validation, processing, and response
- Type-safe with TypeScript interfaces
- Consistent error handling with try/catch
- Sequential async operations with proper await
- Easy to test

### Pattern 3: Graceful Shutdown with Async Cleanup

The server startup and shutdown logic demonstrates async event handling:

```typescript
// From src/index.ts:43-89
async function startServer() {
    try {
        // Validate environment variables
        validateEnv();
        console.log('✅ Environment variables validated successfully');

        // Connect to database
        await connectToDatabase();
        console.log('✅ Database connection established successfully');

        // Start HTTP server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`🔍 Health check: http://localhost:${PORT}/health`);
        });

        // Graceful shutdown handling
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n${signal} received. Starting graceful shutdown...`);

            server.close(async () => {
                console.log('HTTP server closed');

                await disconnectFromDatabase();
                console.log('Database connection closed');

                console.log('Graceful shutdown complete');
                console.log('👋 Goodbye!');
                process.exit(0);
            });
        };

        // Register signal handlers (async events)
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
```

**Key async patterns here:**
1. **Async startup**: `app.listen()` is non-blocking
2. **Event listeners**: Signal handlers are registered for async events
3. **Graceful shutdown**: `server.close()` waits for active connections
4. **Callback-style async**: Some Node.js APIs still use callbacks

### Pattern 4: Sequential vs Parallel Operations

#### Sequential (When Operations Depend on Each Other)

```typescript
async function loadUserDashboard(userId: string) {
    // Step 1: Get user (needed for steps 2 and 3)
    const user = await fetchUser(userId);

    // Step 2: Get user's posts (needs user.id)
    const posts = await fetchUserPosts(user.id);

    // Step 3: Get user's settings (needs user.id)
    const settings = await fetchUserSettings(user.id);

    return {
        user,
        posts,
        settings
    };
}

// Timeline:
// 0-100ms: fetchUser
// 100-200ms: fetchUserPosts
// 200-300ms: fetchUserSettings
// Total: 300ms
```

#### Parallel (When Operations Are Independent)

```typescript
async function loadUserDashboard(userId: string) {
    // Start user fetch
    const userPromise = fetchUser(userId);

    // All these can start immediately
    const [user, globalPosts, siteStats] = await Promise.all([
        userPromise,
        fetchGlobalPosts(),
        fetchSiteStatistics()
    ]);

    // Now get user-specific data (depends on user)
    const [userPosts, userSettings] = await Promise.all([
        fetchUserPosts(user.id),
        fetchUserSettings(user.id)
    ]);

    return {
        user,
        globalPosts,
        siteStats,
        userPosts,
        userSettings
    };
}

// Timeline:
// 0-100ms: fetchUser, fetchGlobalPosts, fetchSiteStatistics (parallel)
// 100-200ms: fetchUserPosts, fetchUserSettings (parallel, after user loaded)
// Total: 200ms (faster!)
```

#### Practical Example: Loading Multiple Resources

```typescript
async function loadApplicationData() {
    console.time('parallel-load');

    // These are independent - load in parallel
    const [admins, users, moderators, totalCount] = await Promise.all([
        pool.query('SELECT * FROM Account WHERE Account_Role = $1 LIMIT 10', [4]),
        pool.query('SELECT * FROM Account WHERE Account_Role = $1 ORDER BY Created_At DESC', [1]),
        pool.query('SELECT * FROM Account WHERE Account_Role = $1', [2]),
        pool.query('SELECT COUNT(*) as total FROM Account')
    ]);

    console.timeEnd('parallel-load');  // ~100ms (one DB round-trip)

    return { admins, users, moderators, totalCount };
}

// vs Sequential (slower):
async function loadApplicationDataSequential() {
    console.time('sequential-load');

    const admins = await pool.query('SELECT * FROM Account WHERE Account_Role = $1 LIMIT 10', [4]);
    const users = await pool.query('SELECT * FROM Account WHERE Account_Role = $1 ORDER BY Created_At DESC', [1]);
    const moderators = await pool.query('SELECT * FROM Account WHERE Account_Role = $1', [2]);
    const totalCount = await pool.query('SELECT COUNT(*) as total FROM Account');

    console.timeEnd('sequential-load');  // ~400ms (four separate round-trips)

    return { admins, users, moderators, totalCount };
}
```

## Advanced Database Patterns

For production applications, understanding advanced database concepts is essential:

- **Transactions**: Ensure data integrity across multiple operations
- **Connection Pooling**: Efficiently manage database connections
- **Query Optimization**: Write performant database queries

**📚 Learn More:** [Database Fundamentals](/docs/database-fundamentals.md) - Comprehensive guide to database transactions, ACID properties, and connection pooling

### Pattern 5: Error Recovery and Fallbacks

Sometimes you want to continue execution even if one async operation fails:

```typescript
async function loadDashboardWithFallbacks(userId: string) {
    // Critical data - must succeed
    const user = await fetchUser(userId);

    // Optional data - use fallbacks if failed
    const [posts, stats, notifications] = await Promise.allSettled([
        fetchUserPosts(user.id),
        fetchUserStats(user.id),
        fetchUserNotifications(user.id)
    ]);

    return {
        user,
        posts: posts.status === 'fulfilled' ? posts.value : [],
        stats: stats.status === 'fulfilled' ? stats.value : { postsCount: 0, likesCount: 0 },
        notifications: notifications.status === 'fulfilled' ? notifications.value : []
    };
}

// User gets partial data even if some requests fail
```

#### With Try/Catch Recovery

```typescript
async function loadUserData(userId: string) {
    const user = await fetchUser(userId);

    // Try to load premium features
    let premiumFeatures = null;
    try {
        premiumFeatures = await fetchPremiumFeatures(user.id);
    } catch (error) {
        console.log('Premium features unavailable, using free tier');
        // Continue without premium features
    }

    // Try to load recommendations
    let recommendations = [];
    try {
        recommendations = await fetchRecommendations(user.id);
    } catch (error) {
        console.log('Recommendations unavailable');
        // Continue without recommendations
    }

    return {
        user,
        premiumFeatures,
        recommendations
    };
}
```

### Pattern 6: Async Retry Logic

Implementing retry logic for unreliable operations:

```typescript
async function fetchWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await operation();
            return result;
        } catch (error) {
            if (attempt === retries) {
                // Last attempt failed
                throw error;
            }

            console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);

            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }

    // TypeScript needs this, but we'll never reach here
    throw new Error('All retries failed');
}

// Usage
const userData = await fetchWithRetry(
    () => fetch('/api/user/123').then(res => res.json()),
    3,  // 3 retries
    1000  // 1 second base delay
);
```

### Pattern 7: Async Rate Limiting

Controlling concurrency with async operations:

```typescript
async function processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    concurrency: number = 5
): Promise<void> {
    const queue = [...items];
    const workers: Promise<void>[] = [];

    // Create worker functions
    async function worker() {
        while (queue.length > 0) {
            const item = queue.shift();
            if (item !== undefined) {
                await processor(item);
            }
        }
    }

    // Start workers
    for (let i = 0; i < concurrency; i++) {
        workers.push(worker());
    }

    // Wait for all workers to complete
    await Promise.all(workers);
}

// Usage: Process 100 items with max 5 concurrent operations
const userIds = Array.from({ length: 100 }, (_, i) => i + 1);
await processBatch(
    userIds,
    async (userId) => {
        const user = await fetchUser(userId);
        await processUser(user);
    },
    5  // Max 5 concurrent operations
);
```

### Pattern 8: Async Event Emitters

Combining events with async operations:

```typescript
import { EventEmitter } from 'events';

class DataService extends EventEmitter {
    async fetchData(id: string): Promise<any> {
        this.emit('fetch:start', { id });

        try {
            const data = await performFetch(id);
            this.emit('fetch:success', { id, data });
            return data;
        } catch (error) {
            this.emit('fetch:error', { id, error });
            throw error;
        } finally {
            this.emit('fetch:complete', { id });
        }
    }
}

// Usage
const service = new DataService();

service.on('fetch:start', ({ id }) => {
    console.log(`Starting fetch for ${id}`);
});

service.on('fetch:success', ({ id, data }) => {
    console.log(`Fetch successful for ${id}`);
});

service.on('fetch:error', ({ id, error }) => {
    console.error(`Fetch failed for ${id}:`, error);
});

const data = await service.fetchData('123');
```

### Summary: Pattern Selection Guide

| Scenario | Pattern to Use |
|----------|---------------|
| Route handlers | asyncHandler wrapper |
| Dependent operations | Sequential await |
| Independent operations | Promise.all() |
| Optional operations | Promise.allSettled() + fallbacks |
| Unreliable services | Retry with exponential backoff |
| Many items to process | Rate limiting with worker pool |
| Need operation visibility | Event emitters |
| Graceful errors | try/catch with recovery |

---

## Practical Examples & Exercises

This section provides hands-on examples and exercises to practice async patterns.

### Example 1: Simulating Async Operations

Create a utility to simulate async delays (useful for testing):

```typescript
/**
 * Delay execution for a specified time
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
async function example() {
    console.log('Starting...');
    await delay(2000);  // Wait 2 seconds
    console.log('2 seconds later');
}

/**
 * Simulate async operation that might fail
 */
function simulateApiCall<T>(
    data: T,
    delayMs: number = 1000,
    successRate: number = 0.8
): Promise<T> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() < successRate) {
                resolve(data);
            } else {
                reject(new Error('API call failed'));
            }
        }, delayMs);
    });
}

// Usage
async function testApiCall() {
    try {
        const result = await simulateApiCall({ id: 1, name: 'Test' }, 1000, 0.8);
        console.log('Success:', result);
    } catch (error) {
        console.error('Failed:', error);
    }
}
```

### Example 2: Building a Simple Async API Wrapper

Create a wrapper for fetch with common functionality:

```typescript
class ApiClient {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.defaultHeaders
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    async post<T>(endpoint: string, data: any): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.defaultHeaders,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    setAuthToken(token: string): void {
        this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
}

// Usage
async function example() {
    const api = new ApiClient('https://api.example.com');

    // Login and get token
    const { token } = await api.post('/auth/login', {
        username: 'user',
        password: 'pass'
    });

    // Set token for subsequent requests
    api.setAuthToken(token);

    // Fetch protected data
    const userData = await api.get('/user/profile');
    console.log('User:', userData);
}
```

### Example 3: Error Handling Scenarios

Practice different error handling strategies:

```typescript
// Scenario 1: Fail fast
async function failFast() {
    try {
        const user = await fetchUser();  // If this fails, stop
        const posts = await fetchPosts(user.id);  // Won't run if user fails
        return { user, posts };
    } catch (error) {
        console.error('Operation failed:', error);
        throw error;  // Propagate error
    }
}

// Scenario 2: Collect all errors
async function collectErrors() {
    const results = await Promise.allSettled([
        fetchUsers(),
        fetchPosts(),
        fetchComments()
    ]);

    const errors: Error[] = [];
    const data: any = {};

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            data[['users', 'posts', 'comments'][index]] = result.value;
        } else {
            errors.push(result.reason);
        }
    });

    if (errors.length > 0) {
        console.error('Some operations failed:', errors);
    }

    return data;
}

// Scenario 3: Fallback values
async function withFallbacks() {
    const [users, posts] = await Promise.all([
        fetchUsers().catch(err => {
            console.error('Users fetch failed, using empty array');
            return [];
        }),
        fetchPosts().catch(err => {
            console.error('Posts fetch failed, using empty array');
            return [];
        })
    ]);

    return { users, posts };
}
```

### Exercise 1: Convert Callback Code to Promises

**Task:** Convert this callback-based code to use promises and async/await:

```javascript
// START: Callback version
function loadUserData(userId, callback) {
    db.getUser(userId, (err, user) => {
        if (err) return callback(err);

        db.getUserPosts(user.id, (err, posts) => {
            if (err) return callback(err);

            db.getUserComments(user.id, (err, comments) => {
                if (err) return callback(err);

                callback(null, { user, posts, comments });
            });
        });
    });
}
```

**Solution:**

```typescript
// SOLUTION: Promise version
async function loadUserData(userId: string) {
    const user = await db.getUser(userId);
    const posts = await db.getUserPosts(user.id);
    const comments = await db.getUserComments(user.id);

    return { user, posts, comments };
}

// Bonus: Parallel version (if posts and comments are independent)
async function loadUserDataParallel(userId: string) {
    const user = await db.getUser(userId);

    const [posts, comments] = await Promise.all([
        db.getUserPosts(user.id),
        db.getUserComments(user.id)
    ]);

    return { user, posts, comments };
}
```

### Exercise 2: Add Async Middleware

**Task:** Create an async middleware that:
1. Checks if user is authenticated
2. Loads user data from database
3. Attaches user to request object
4. Handles errors appropriately

**Solution:**

```typescript
const loadUserMiddleware = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Check for session token
        const sessionToken = req.cookies.sessionToken;

        if (!sessionToken) {
            throw new AppError(
                'Authentication required',
                401,
                ErrorCodes.UNAUTHORIZED
            );
        }

        // Verify token and get user ID
        const userId = await verifySessionToken(sessionToken);

        if (!userId) {
            throw new AppError(
                'Invalid session token',
                401,
                ErrorCodes.UNAUTHORIZED
            );
        }

        // Load user from database
        const user = await db.getUser(userId);

        if (!user) {
            throw new AppError(
                'User not found',
                404,
                ErrorCodes.NOT_FOUND
            );
        }

        // Attach to request
        req.user = user;

        // Continue to next middleware
        next();
    }
);

// Usage
app.get('/profile', loadUserMiddleware, asyncHandler(async (req, res) => {
    res.json({
        user: req.user
    });
}));
```

### Exercise 3: Handle Multiple Async Operations

**Task:** Load data from multiple APIs, handling partial failures gracefully.

**Solution:**

```typescript
async function loadDashboard(userId: string) {
    // Critical data - must succeed
    const user = await fetchUser(userId);

    // Load multiple optional data sources
    const results = await Promise.allSettled([
        fetchWeatherData(),
        fetchNewsHeadlines(),
        fetchStockPrices(),
        fetchUserNotifications(userId)
    ]);

    // Extract successful results with fallbacks
    const [weather, news, stocks, notifications] = results.map(
        (result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }

            // Log failure
            console.error(`Source ${index} failed:`, result.reason);

            // Return fallback
            return null;
        }
    );

    return {
        user,
        dashboard: {
            weather: weather || { temp: 'N/A', condition: 'Unknown' },
            news: news || [],
            stocks: stocks || [],
            notifications: notifications || []
        }
    };
}
```

### Exercise 4: Implement Timeout for Async Operations

**Task:** Create a utility that adds timeout to any promise.

**Solution:**

```typescript
function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(timeoutMessage));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
}

// Usage
async function fetchWithTimeout() {
    try {
        const data = await withTimeout(
            fetch('/api/slow-endpoint').then(res => res.json()),
            5000,  // 5 second timeout
            'API request timed out after 5 seconds'
        );
        console.log('Data:', data);
    } catch (error) {
        if (error.message.includes('timed out')) {
            console.error('Request was too slow');
        } else {
            console.error('Request failed:', error);
        }
    }
}
```

### Practice Challenges

Try these on your own:

1. **Challenge 1:** Implement a cache that stores async operation results
   - First call should fetch from API
   - Subsequent calls should return cached value
   - Cache should expire after 5 minutes

2. **Challenge 2:** Create a queue system that processes async tasks one at a time
   - Add tasks to queue
   - Process them sequentially
   - Return results when all complete

3. **Challenge 3:** Build a rate limiter that ensures no more than N requests per second
   - Use promises to queue excess requests
   - Release them at appropriate intervals

---

## Common Pitfalls & Best Practices

Learn from common mistakes and adopt best practices for async code.

### Pitfall 1: Forgetting `await`

**Problem:**

```typescript
// ❌ BAD: Missing await
async function getUser() {
    const user = fetchUser();  // Returns Promise, not user data!
    console.log(user.name);    // TypeError: Cannot read property 'name' of undefined
    return user;
}
```

**Solution:**

```typescript
// ✅ GOOD: Using await
async function getUser() {
    const user = await fetchUser();  // Wait for promise to resolve
    console.log(user.name);          // Now user is the actual data
    return user;
}
```

**How to catch:**
- TypeScript will warn if you try to access properties on a Promise
- Use linters (ESLint with @typescript-eslint)
- Enable strict type checking

### Pitfall 2: Not Handling Errors

**Problem:**

```typescript
// ❌ BAD: No error handling
async function loadData() {
    const data = await fetchData();  // What if this throws?
    return processData(data);
}

// Caller never knows about errors!
loadData().then(result => console.log(result));
// Unhandled promise rejection!
```

**Solution:**

```typescript
// ✅ GOOD: Proper error handling
async function loadData() {
    try {
        const data = await fetchData();
        return processData(data);
    } catch (error) {
        console.error('Failed to load data:', error);
        throw error;  // Re-throw or handle appropriately
    }
}

// Caller can handle errors
loadData()
    .then(result => console.log(result))
    .catch(error => console.error('Load failed:', error));
```

**Best practice:**
- Always handle errors with try/catch
- Or let asyncHandler catch them in Express routes
- Never leave promises unhandled

### Pitfall 3: Unnecessary Sequential Awaits

**Problem:**

```typescript
// ❌ BAD: Sequential when could be parallel (slow!)
async function loadPageData() {
    const users = await fetchUsers();      // Wait 100ms
    const products = await fetchProducts(); // Wait 100ms
    const settings = await fetchSettings(); // Wait 100ms
    return { users, products, settings };
}
// Total time: 300ms
```

**Solution:**

```typescript
// ✅ GOOD: Parallel execution (fast!)
async function loadPageData() {
    const [users, products, settings] = await Promise.all([
        fetchUsers(),
        fetchProducts(),
        fetchSettings()
    ]);
    return { users, products, settings };
}
// Total time: 100ms (fastest operation)
```

**When to use which:**
- **Sequential**: When operations depend on each other
- **Parallel**: When operations are independent

### Pitfall 4: Async in Array Methods

**Problem:**

```typescript
// ❌ BAD: forEach doesn't wait for async
async function processUsers(userIds: string[]) {
    userIds.forEach(async (id) => {
        const user = await fetchUser(id);
        await saveUser(user);
    });
    console.log('Done!');  // Logs immediately, before processing finishes!
}
```

**Solution:**

```typescript
// ✅ GOOD: Use for...of for sequential
async function processUsers(userIds: string[]) {
    for (const id of userIds) {
        const user = await fetchUser(id);
        await saveUser(user);
    }
    console.log('Done!');  // Logs after all processing
}

// ✅ GOOD: Use Promise.all for parallel
async function processUsersParallel(userIds: string[]) {
    await Promise.all(
        userIds.map(async (id) => {
            const user = await fetchUser(id);
            return saveUser(user);
        })
    );
    console.log('Done!');  // Logs after all processing
}
```

**Remember:**
- `.forEach()`, `.map()`, `.filter()` don't wait for async functions
- Use `for...of` for sequential async operations
- Use `Promise.all()` with `.map()` for parallel

### Pitfall 5: Mixing Promises and Callbacks

**Problem:**

```typescript
// ❌ BAD: Mixing patterns
async function getData() {
    return new Promise((resolve, reject) => {
        fetchData((err, data) => {  // Callback inside promise
            if (err) reject(err);
            else resolve(data);
        });
    });
}
```

**Solution:**

```typescript
// ✅ GOOD: Promisify once, use consistently
const fetchDataPromise = util.promisify(fetchData);

async function getData() {
    return await fetchDataPromise();  // Clean async/await
}

// Or use modern APIs that return promises
const fs = require('fs').promises;
async function readConfig() {
    return await fs.readFile('config.json', 'utf8');
}
```

### Pitfall 6: Creating Unnecessary Promises

**Problem:**

```typescript
// ❌ BAD: Wrapping a promise in a promise
async function getUser() {
    return new Promise((resolve, reject) => {
        fetchUser()  // Already returns a promise!
            .then(user => resolve(user))
            .catch(err => reject(err));
    });
}
```

**Solution:**

```typescript
// ✅ GOOD: Return promise directly
async function getUser() {
    return fetchUser();  // That's it!
}

// Or just:
const getUser = fetchUser;
```

### Pitfall 7: Not Using TypeScript Types

**Problem:**

```typescript
// ❌ BAD: No types, runtime errors possible
async function getUser(id) {
    const response = await fetch(`/api/user/${id}`);
    const data = await response.json();
    return data.user.profile.name;  // What if structure is different?
}
```

**Solution:**

```typescript
// ✅ GOOD: Proper typing
interface User {
    id: string;
    profile: {
        name: string;
        email: string;
    };
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

async function getUser(id: string): Promise<User> {
    const response = await fetch(`/api/user/${id}`);
    const json: ApiResponse<User> = await response.json();

    if (!json.success) {
        throw new Error('Failed to fetch user');
    }

    return json.data;
}
```

### Best Practices

#### 1. Always Handle Errors

```typescript
// Use try/catch
async function robustOperation() {
    try {
        return await riskyOperation();
    } catch (error) {
        console.error('Operation failed:', error);
        // Handle, re-throw, or return fallback
        throw error;
    }
}

// Or use .catch()
async function alternativeHandling() {
    return await riskyOperation().catch(error => {
        console.error('Operation failed:', error);
        throw error;
    });
}
```

#### 2. Use Meaningful Error Messages

```typescript
// ❌ BAD
throw new Error('Error');

// ✅ GOOD
throw new AppError(
    `User ${userId} not found in database`,
    404,
    ErrorCodes.NOT_FOUND
);
```

#### 3. Consider Timeouts

```typescript
async function fetchWithTimeout(url: string, timeout: number = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}
```

#### 4. Log Async Operations

```typescript
async function trackedOperation(id: string) {
    console.log(`[${id}] Starting operation`);
    const start = Date.now();

    try {
        const result = await performOperation();
        const duration = Date.now() - start;
        console.log(`[${id}] Completed in ${duration}ms`);
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        console.error(`[${id}] Failed after ${duration}ms:`, error);
        throw error;
    }
}
```

#### 5. Use Appropriate Concurrency

```typescript
// Don't hammer APIs with unlimited concurrency
async function processManyItems(items: string[]) {
    const BATCH_SIZE = 5;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(processItem));
    }
}
```

#### 6. Document Async Behavior

```typescript
/**
 * Fetches user data from the database
 *
 * @param userId - Unique user identifier
 * @returns Promise resolving to user data
 * @throws {AppError} If user not found (404)
 * @throws {AppError} If database connection fails (500)
 *
 * @example
 * ```typescript
 * const user = await getUser('123');
 * console.log(user.name);
 * ```
 */
async function getUser(userId: string): Promise<User> {
    // Implementation
}
```

### Quick Reference: Do's and Don'ts

| ❌ Don't | ✅ Do |
|---------|------|
| Forget `await` | Always `await` promises |
| Ignore errors | Use try/catch or `.catch()` |
| Sequential when parallel possible | Use `Promise.all()` for independent ops |
| Use `.forEach()` with async | Use `for...of` or `Promise.all()` |
| Mix callbacks and promises | Use consistent async patterns |
| Wrap promises unnecessarily | Return promises directly |
| Leave types as `any` | Use proper TypeScript types |
| Swallow errors silently | Log and handle appropriately |

---

## Debugging Async Code

Debugging asynchronous code requires different techniques than synchronous code. This section covers tools and strategies for effective async debugging.

### Understanding Async Stack Traces

Traditional stack traces can be confusing with async code:

```javascript
async function a() {
    await b();
}

async function b() {
    await c();
}

async function c() {
    throw new Error('Something went wrong');
}

a().catch(console.error);

// Stack trace (simplified):
// Error: Something went wrong
//     at c (file.js:10)
//     at async b (file.js:6)
//     at async a (file.js:2)
```

**Good news:** Modern Node.js and browsers preserve async stack traces, showing the full call chain.

### Using `console.log` Effectively

Strategic logging helps trace async flow:

```typescript
async function processOrder(orderId: string) {
    console.log(`[${orderId}] Starting order processing`);

    try {
        console.log(`[${orderId}] Fetching order details`);
        const order = await fetchOrder(orderId);
        console.log(`[${orderId}] Order fetched:`, order);

        console.log(`[${orderId}] Validating payment`);
        const payment = await validatePayment(order.paymentId);
        console.log(`[${orderId}] Payment validated:`, payment);

        console.log(`[${orderId}] Processing shipment`);
        const shipment = await processShipment(order);
        console.log(`[${orderId}] Shipment processed:`, shipment);

        console.log(`[${orderId}] Order processing complete`);
        return { order, payment, shipment };
    } catch (error) {
        console.error(`[${orderId}] Error during processing:`, error);
        throw error;
    }
}
```

**Tips:**
- Prefix logs with request ID for tracing
- Log entry and exit of async functions
- Log data shapes, not full objects (can be huge)
- Use log levels (debug, info, warn, error)

### Using the Debugger with Async/Await

Modern debuggers handle async code well:

```typescript
async function debugExample() {
    debugger;  // 1. Execution pauses here

    const data = await fetchData();
    debugger;  // 2. Pauses again after fetchData resolves

    const processed = processData(data);
    debugger;  // 3. Pauses after synchronous processing

    return processed;
}
```

**VS Code debugging:**
1. Set breakpoints in async functions
2. Use "Step Over" (F10) to await promises
3. Use "Step Into" (F11) to enter async functions
4. Inspect variables in Debug panel

**Chrome DevTools:**
1. Add `debugger` statements or click line numbers
2. Sources panel shows async call stack
3. Console available while paused
4. Can evaluate async expressions in console

### Logging Promise States

Track promise resolution/rejection:

```typescript
function loggedPromise<T>(
    name: string,
    promise: Promise<T>
): Promise<T> {
    console.log(`[${name}] Promise created`);

    return promise
        .then(result => {
            console.log(`[${name}] Promise fulfilled:`, result);
            return result;
        })
        .catch(error => {
            console.error(`[${name}] Promise rejected:`, error);
            throw error;
        });
}

// Usage
async function example() {
    const user = await loggedPromise('fetchUser', fetchUser('123'));
    const posts = await loggedPromise('fetchPosts', fetchPosts(user.id));
    return { user, posts };
}
```

### Timing Async Operations

Measure performance of async operations:

```typescript
async function timedOperation<T>(
    name: string,
    operation: () => Promise<T>
): Promise<T> {
    console.time(name);
    try {
        const result = await operation();
        console.timeEnd(name);
        return result;
    } catch (error) {
        console.timeEnd(name);
        throw error;
    }
}

// Usage
const user = await timedOperation('fetchUser', () => fetchUser('123'));
// Logs: fetchUser: 145.234ms
```

### Common Error Messages and What They Mean

#### "UnhandledPromiseRejectionWarning"

```
(node:1234) UnhandledPromiseRejectionWarning: Error: Something went wrong
```

**Cause:** A promise rejected but no `.catch()` or try/catch handled it.

**Fix:**
```typescript
// Add error handling
await operation().catch(error => {
    console.error('Operation failed:', error);
});
```

#### "Cannot read property 'x' of undefined"

In async context, usually means:
```typescript
// Problem: Missing await
const user = fetchUser();  // Returns Promise
console.log(user.name);    // Error: user is Promise, not object

// Fix: Add await
const user = await fetchUser();
console.log(user.name);  // Works!
```

#### "Timeout of Xms exceeded"

**Cause:** Async operation took longer than allowed.

**Debug:**
```typescript
async function debugTimeout() {
    const timeout = setTimeout(() => {
        console.log('Operation taking longer than expected');
    }, 5000);

    try {
        const result = await slowOperation();
        clearTimeout(timeout);
        return result;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}
```

### Using Node.js Inspector

Node.js built-in debugger:

```bash
# Start Node with inspector
node --inspect-brk index.js

# Opens debugger on port 9229
# Chrome DevTools at: chrome://inspect
```

**Features:**
- Set breakpoints in Chrome DevTools
- Inspect async call stacks
- Profile async performance
- View promise states

### Tools for Async Debugging

1. **VS Code Debugger**
   - Built-in support for async debugging
   - Set breakpoints in TypeScript source
   - Inspect promise values

2. **Chrome DevTools**
   - Network panel for API calls
   - Performance panel for async timing
   - Console for interactive debugging

3. **Async Hooks (Advanced)**
   ```typescript
   const async_hooks = require('async_hooks');

   const hook = async_hooks.createHook({
       init(asyncId, type, triggerAsyncId) {
           console.log(`Async operation ${type} created`);
       },
       before(asyncId) {
           console.log(`Before async operation ${asyncId}`);
       },
       after(asyncId) {
           console.log(`After async operation ${asyncId}`);
       }
   });

   hook.enable();
   ```

### Debugging Checklist

When debugging async issues:

- [ ] Are all promises awaited?
- [ ] Is error handling in place?
- [ ] Are async operations running in correct order?
- [ ] Is data available when expected?
- [ ] Are there any race conditions?
- [ ] Are timeouts configured?
- [ ] Is logging showing execution flow?
- [ ] Are types correct (not mixing Promise with values)?

---

## Testing Async Code

Testing asynchronous code requires special considerations. This section covers patterns for testing async functions.

### Basic Async Test Pattern

Most modern test frameworks support async tests:

```typescript
// Using Jest
describe('User Service', () => {
    it('should fetch user data', async () => {
        const user = await userService.getUser('123');

        expect(user).toBeDefined();
        expect(user.id).toBe('123');
        expect(user.name).toBe('John Doe');
    });

    it('should handle user not found', async () => {
        await expect(userService.getUser('nonexistent'))
            .rejects
            .toThrow('User not found');
    });
});
```

### Testing Promise Resolution

```typescript
it('should resolve with user data', () => {
    return userService.getUser('123').then(user => {
        expect(user.id).toBe('123');
    });
});

// Or with async/await (preferred)
it('should resolve with user data', async () => {
    const user = await userService.getUser('123');
    expect(user.id).toBe('123');
});
```

### Testing Promise Rejection

```typescript
it('should reject with error', async () => {
    await expect(userService.getUser('invalid'))
        .rejects
        .toThrow('Invalid user ID');
});

// Or with try/catch
it('should reject with error', async () => {
    try {
        await userService.getUser('invalid');
        fail('Should have thrown error');
    } catch (error) {
        expect(error.message).toBe('Invalid user ID');
    }
});
```

### Mocking Async Operations

```typescript
// Mock async function
jest.mock('./userService');

it('should handle mocked async call', async () => {
    // Setup mock
    const mockUser = { id: '123', name: 'Mock User' };
    userService.getUser = jest.fn().mockResolvedValue(mockUser);

    // Test
    const user = await userService.getUser('123');

    expect(user).toEqual(mockUser);
    expect(userService.getUser).toHaveBeenCalledWith('123');
});

it('should handle mocked rejection', async () => {
    // Setup mock to reject
    userService.getUser = jest.fn().mockRejectedValue(
        new Error('Database error')
    );

    // Test
    await expect(userService.getUser('123'))
        .rejects
        .toThrow('Database error');
});
```

### Testing Sequential Async Operations

```typescript
it('should execute operations in order', async () => {
    const calls: string[] = [];

    const fetchUser = jest.fn().mockImplementation(async () => {
        calls.push('user');
        return { id: '1', name: 'User' };
    });

    const fetchPosts = jest.fn().mockImplementation(async () => {
        calls.push('posts');
        return [];
    });

    await processUserData(fetchUser, fetchPosts);

    expect(calls).toEqual(['user', 'posts']);
});
```

### Testing Parallel Async Operations

```typescript
it('should execute operations in parallel', async () => {
    const start = Date.now();

    // Each operation takes 100ms
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    await Promise.all([
        delay(100),
        delay(100),
        delay(100)
    ]);

    const duration = Date.now() - start;

    // Should complete in ~100ms (parallel), not 300ms (sequential)
    expect(duration).toBeLessThan(150);
});
```

### Testing Timeouts

```typescript
it('should timeout after specified duration', async () => {
    const slowOperation = () => new Promise(
        resolve => setTimeout(resolve, 5000)
    );

    await expect(
        withTimeout(slowOperation(), 1000)
    ).rejects.toThrow('Timeout');
}, 2000);  // Test timeout: 2 seconds
```

### Testing Error Recovery

```typescript
it('should retry on failure', async () => {
    let attempts = 0;

    const flaky = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
            throw new Error('Temporary failure');
        }
        return 'success';
    });

    const result = await retryOperation(flaky, 3);

    expect(result).toBe('success');
    expect(attempts).toBe(3);
});
```

### Integration Testing Async Endpoints

```typescript
// Using supertest with Express
import request from 'supertest';
import app from './app';

describe('GET /user/:id', () => {
    it('should return user data', async () => {
        const response = await request(app)
            .get('/user/123')
            .expect(200);

        expect(response.body).toHaveProperty('id', '123');
        expect(response.body).toHaveProperty('name');
    });

    it('should return 404 for non-existent user', async () => {
        await request(app)
            .get('/user/nonexistent')
            .expect(404);
    });
});
```

### Best Practices for Testing Async Code

1. **Always return or await promises in tests**
   ```typescript
   // ❌ BAD: Test completes before async operation
   it('bad test', () => {
       someAsyncOperation();  // Not awaited!
   });

   // ✅ GOOD
   it('good test', async () => {
       await someAsyncOperation();
   });
   ```

2. **Set appropriate timeouts**
   ```typescript
   it('slow operation', async () => {
       await verySlowOperation();
   }, 10000);  // 10 second timeout
   ```

3. **Clean up after tests**
   ```typescript
   afterEach(async () => {
       await database.clear();
       await cache.flush();
   });
   ```

4. **Use fake timers for time-dependent code**
   ```typescript
   jest.useFakeTimers();

   it('should execute after delay', async () => {
       const callback = jest.fn();
       setTimeout(callback, 1000);

       jest.advanceTimersByTime(1000);
       await Promise.resolve();  // Flush promises

       expect(callback).toHaveBeenCalled();
   });
   ```

---

## Further Reading & Resources

Continue your async JavaScript learning journey with these resources.

### Official Documentation

**JavaScript & Node.js:**
- [MDN: Async functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Node.js: Event Loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [Node.js: Asynchronous Programming](https://nodejs.org/en/learn/asynchronous-work/overview-of-blocking-vs-non-blocking)

**TypeScript:**
- [TypeScript: Async Functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-7.html#async-functions)
- [TypeScript: Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

### Interactive Learning

**Visualizations:**
- [Loupe: Event Loop Visualizer](http://latentflip.com/loupe/) - See how the event loop processes code
- [JavaScript Visualizer](https://www.jsv9000.app/) - Visualize async code execution

**Tutorials:**
- [javascript.info: Async/await](https://javascript.info/async-await)
- [javascript.info: Promises](https://javascript.info/promise-basics)

### Books

**Recommended Reading:**
- "You Don't Know JS: Async & Performance" by Kyle Simpson
- "Node.js Design Patterns" by Mario Casciaro & Luciano Mammino
- "JavaScript: The Definitive Guide" by David Flanagan (Chapters on Async)

### Video Courses

- [FreeCodeCamp: Async JavaScript](https://www.youtube.com/watch?v=PoRJizFvM7s)
- [The Net Ninja: Async JavaScript](https://www.youtube.com/playlist?list=PL4cUxeGkcC9jx2TTZk3IGWKSbtugYdrlu)

### Articles & Blog Posts

**Deep Dives:**
- [Jake Archibald: Tasks, microtasks, queues and schedules](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)
- [Philip Roberts: What the heck is the event loop anyway?](https://www.youtube.com/watch?v=8aGhZQkoFbQ) (Video)

### Related Documentation in This Project

**Continue Learning:**
- [Node.js & Express Architecture](./node-express-architecture.md) - How async fits into Express applications
- [Error Handling Patterns](./error-handling-patterns.md) - Comprehensive error handling strategies
- [Development Workflow](./development-workflow.md) - TypeScript compilation and development process
- [Testing Strategies](./testing-strategies.md) - Complete guide to testing, including async tests

### Tools & Libraries

**Async Utilities:**
- [p-limit](https://www.npmjs.com/package/p-limit) - Limit promise concurrency
- [p-queue](https://www.npmjs.com/package/p-queue) - Promise queue with concurrency control
- [p-retry](https://www.npmjs.com/package/p-retry) - Retry failed promises
- [p-timeout](https://www.npmjs.com/package/p-timeout) - Add timeouts to promises

**Express Async:**
- [express-async-errors](https://www.npmjs.com/package/express-async-errors) - Automatic async error handling
- [express-async-handler](https://www.npmjs.com/package/express-async-handler) - Alternative asyncHandler implementation

### Community

**Get Help:**
- [Stack Overflow: async-await tag](https://stackoverflow.com/questions/tagged/async-await)
- [Node.js Discord](https://discord.gg/nodejs)
- [r/node Reddit Community](https://www.reddit.com/r/node/)

### Next Steps

After mastering async JavaScript, explore:

1. **Worker Threads** - True parallelism for CPU-intensive tasks
2. **Streams** - Processing large datasets asynchronously
3. **Generators** - Advanced async iteration patterns
4. **Reactive Programming** - RxJS and observables

### Practice Projects

Build these to solidify your understanding:

1. **API Aggregator** - Fetch data from multiple APIs in parallel
2. **Rate-Limited Scraper** - Respect API rate limits while fetching data
3. **Background Job Processor** - Process tasks from a queue
4. **Real-time Dashboard** - Handle multiple async data sources

---

## Summary

You've learned:

✅ **Why async matters** - Non-blocking I/O enables Node.js scalability
✅ **Event loop architecture** - Single-threaded JavaScript with async capabilities
✅ **Evolution of async patterns** - Callbacks → Promises → Async/Await
✅ **Error handling** - Try/catch, promise chains, asyncHandler pattern
✅ **Performance optimization** - Sequential vs parallel execution
✅ **Common pitfalls** - And how to avoid them
✅ **Debugging techniques** - Stack traces, logging, and tools
✅ **Testing strategies** - Mocking, assertions, and timeouts

**Remember:**
- Async/await is syntactic sugar over promises
- Always handle errors appropriately
- Use Promise.all() for parallel operations
- The event loop enables concurrency without threads
- Practice makes perfect!

---

*This documentation is part of the TCSS-460 Message API educational project. For questions or improvements, please see the [project repository](/).*