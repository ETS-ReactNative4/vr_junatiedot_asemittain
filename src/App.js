import React, { Component } from 'react';
import './App.css';
import SearchBar from "./SearchBar.js"


class App extends Component {
  render() {
    return (
      <div>
        <header className="App-header">
          <h1>Aseman aikataulu</h1>
        </header>
        <SearchBar/>
      </div>
    );
  }
}

export default App;
