// Hello.js
// test routes

export default function Hello(app) {
    // say hello
    const sayHello = (req, res) => {
        res.send("Life is good!");
    };

    // welcome message
    const sayWelcome = (req, res) => {
        res.send("Welcome to Full Stack Development!");
    };

    // register routes
    app.get("/hello", sayHello);
    app.get("/", sayWelcome);
}