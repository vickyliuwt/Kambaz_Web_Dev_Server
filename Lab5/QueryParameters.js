// Lab5/QueryParameters.js
// calculator with query parameters

export default function QueryParameters(app) {
    // calculator for all operations
    const calculator = (req, res) => {
        const { a, b, operation } = req.query;

        let result = 0;

        // check params
        if (!a || !b || !operation) {
            res.status(400).send("Missing required parameters: a, b, and operation");
            return;
        }

        // do the math
        switch (operation) {
            case "add":
                result = parseInt(a) + parseInt(b);
                break;

            case "subtract":
                result = parseInt(a) - parseInt(b);
                break;

            case "multiply":
                result = parseInt(a) * parseInt(b);
                break;

            case "divide":
                if (parseInt(b) === 0) {
                    result = "Cannot divide by zero";
                } else {
                    result = parseInt(a) / parseInt(b);
                }
                break;

            default:
                result = "Invalid operation. Use: add, subtract, multiply, or divide";
        }

        res.send(result.toString());
    };

    // register route
    app.get("/lab5/calculator", calculator);
}