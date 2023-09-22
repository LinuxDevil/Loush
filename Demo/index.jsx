/** @jsx Loush.createElement */
function Counter() {
    const [state, setState] = Loush.useState(1)
    return (
        <h1 onClick={() => setState(c => c + 1)}>
            Count: {state}
        </h1>
    )
}
const element = <Counter />
const container = document.getElementById("root")
Loush.render(element, container)
