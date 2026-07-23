// Lab5/PathParameters.js
// basic math with path parameters

export default function PathParameters(app) {
    // add two numbers
    const add = (req, res) => {
        const { a, b } = req.params;
        const sum = parseInt(a) + parseInt(b);
        res.send(sum.toString());
    };

    // subtract b from a
    const subtract = (req, res) => {
        const { a, b } = req.params;
        const difference = parseInt(a) - parseInt(b);
        res.send(difference.toString());
    };

    // multiply two numbers
    const multiply = (req, res) => {
        const { a, b } = req.params;
        const product = parseInt(a) * parseInt(b);
        res.send(product.toString());
    };

    // divide a by b
    const divide = (req, res) => {
        const { a, b } = req.params;

        if (parseInt(b) === 0) {
            res.status(400).send("Cannot divide by zero");
            return;
        }

        const quotient = parseInt(a) / parseInt(b);
        res.send(quotient.toString());
    };

    // register routes
    app.get("/lab5/add/:a/:b", add);
    app.get("/lab5/subtract/:a/:b", subtract);
    app.get("/lab5/multiply/:a/:b", multiply);
    app.get("/lab5/divide/:a/:b", divide);
}