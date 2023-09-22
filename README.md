# Loush

Loush is a very simple implementation of React. It is a library that allows you to create components and render them to the DOM. It is not a framework, it is not a replacement for React, it is just a simple implementation of React.

## Features

- **Simple Rendering**: Render components to the DOM.
- **Functional Components**: Use functional components for building your views.
- **`useState` Hook**: Maintain state inside your functional components.
- **`useEffect` Hook**: Manage side effects in your components, with cleanup functionality.

## Quick Start

```javascript
function App(props) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    document.title = `Count: ${count}`;
    return () => {
      document.title = "Loush App";
    };
  }, [count]);

  return <h1 onClick={() => setCount(count + 1)}>Click me: {count}</h1>;
}

const rootElement = document.getElementById("root");
Loush.render(<App />, rootElement);
```

## How It Works

Loush is built to understand the core concepts behind React. While it supports the rendering of functional components and provides hooks for state and effects, it does not include many of the optimizations and features present in the actual React library.

### `useEffect`

The `useEffect` hook in Loush has been implemented to support cleanup functions. After rendering, any cleanup functions from the previous render are executed before running the effects for the current render. This allows for better management of side effects.

```javascript
useEffect(() => {
  // effect logic here

  return () => {
    // cleanup logic here
  };
}, [dependencies]);
```

## More Resources

If you'd like to dive deeper into how React works and even build your own version of it, this brilliant tutorial is highly recommended: [Build Your Own React](https://pomb.us/build-your-own-react/).
