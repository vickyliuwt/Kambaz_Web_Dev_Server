// Lab5/WorkingWithArrays.js
// todo list crud operations

// sample todos
let todos = [
    {
        id: 1,
        title: "Task 1",
        completed: false,
        description: "Complete Lab 5"
    },
    {
        id: 2,
        title: "Task 2",
        completed: true,
        description: "Study for exam"
    },
    {
        id: 3,
        title: "Task 3",
        completed: false,
        description: "Submit assignment"
    },
    {
        id: 4,
        title: "Task 4",
        completed: true,
        description: "Review lecture notes"
    },
];

export default function WorkingWithArrays(app) {
    // get all or filter by completed
    const getTodos = (req, res) => {
        const { completed } = req.query;

        // filter if provided
        if (completed !== undefined) {
            const completedBool = completed === "true";
            const filteredTodos = todos.filter(
                (t) => t.completed === completedBool
            );
            res.json(filteredTodos);
            return;
        }

        // return all
        res.json(todos);
    };

    // get by id
    const getTodoById = (req, res) => {
        const { id } = req.params;
        const todo = todos.find((t) => t.id === parseInt(id));

        if (!todo) {
            res.status(404).json({
                message: `Todo with ID ${id} not found`
            });
            return;
        }

        res.json(todo);
    };

    // create new (using GET)
    const createNewTodo = (req, res) => {
        const newTodo = {
            id: new Date().getTime(),
            title: "New Task",
            completed: false,
            description: "New task description"
        };
        todos.push(newTodo);
        res.json(todos);
    };

    // create new (using POST)
    const postNewTodo = (req, res) => {
        const newTodo = {
            ...req.body,
            id: new Date().getTime()
        };
        todos.push(newTodo);
        res.json(newTodo);
    };

    // delete (using GET)
    const removeTodo = (req, res) => {
        const { id } = req.params;
        const todoIndex = todos.findIndex((t) => t.id === parseInt(id));

        if (todoIndex === -1) {
            res.status(404).json({
                message: `Unable to delete Todo with ID ${id}`
            });
            return;
        }

        todos.splice(todoIndex, 1);
        res.json(todos);
    };

    // delete (using DELETE)
    const deleteTodo = (req, res) => {
        const { id } = req.params;
        const todoIndex = todos.findIndex((t) => t.id === parseInt(id));

        if (todoIndex === -1) {
            res.status(404).json({
                message: `Unable to delete Todo with ID ${id}`
            });
            return;
        }

        todos.splice(todoIndex, 1);
        res.sendStatus(200);
    };

    // update title
    const updateTodoTitle = (req, res) => {
        const { id, title } = req.params;
        const todo = todos.find((t) => t.id === parseInt(id));

        if (!todo) {
            res.status(404).json({
                message: `Unable to update Todo with ID ${id}`
            });
            return;
        }

        todo.title = title;
        res.json(todos);
    };

    // update completed
    const updateTodoCompleted = (req, res) => {
        const { id, completed } = req.params;
        const todo = todos.find((t) => t.id === parseInt(id));

        if (!todo) {
            res.status(404).json({
                message: `Unable to update Todo with ID ${id}`
            });
            return;
        }

        todo.completed = completed === "true";
        res.json(todos);
    };

    // update description
    const updateTodoDescription = (req, res) => {
        const { id, description } = req.params;
        const todo = todos.find((t) => t.id === parseInt(id));

        if (!todo) {
            res.status(404).json({
                message: `Unable to update Todo with ID ${id}`
            });
            return;
        }

        todo.description = description;
        res.json(todos);
    };

    // update entire todo (using PUT)
    const updateTodo = (req, res) => {
        const { id } = req.params;
        const todoIndex = todos.findIndex((t) => t.id === parseInt(id));

        if (todoIndex === -1) {
            res.status(404).json({
                message: `Unable to update Todo with ID ${id}`
            });
            return;
        }

        // update with new data
        todos = todos.map((t) => {
            if (t.id === parseInt(id)) {
                return { ...t, ...req.body };
            }
            return t;
        });

        res.sendStatus(200);
    };

    // register routes
    // create routes first
    app.get("/lab5/todos/create", createNewTodo);
    app.post("/lab5/todos", postNewTodo);

    // read routes
    app.get("/lab5/todos", getTodos);
    app.get("/lab5/todos/:id", getTodoById);

    // update routes
    app.get("/lab5/todos/:id/title/:title", updateTodoTitle);
    app.get("/lab5/todos/:id/completed/:completed", updateTodoCompleted);
    app.get("/lab5/todos/:id/description/:description", updateTodoDescription);
    app.put("/lab5/todos/:id", updateTodo);

    // delete routes
    app.get("/lab5/todos/:id/delete", removeTodo);
    app.delete("/lab5/todos/:id", deleteTodo);
}