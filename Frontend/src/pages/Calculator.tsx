import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Calculator.css';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'professional'>('professional');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isScientific, setIsScientific] = useState(false);
  const [memory, setMemory] = useState(0);
  const [showMemory, setShowMemory] = useState(false);
  const [calculatorMode, setCalculatorMode] = useState<'standard' | 'programmer'>('standard');
  const [currentExpression, setCurrentExpression] = useState<string>('');
  const navigate = useNavigate();

  const addToHistory = (calculation: string) => {
    setHistory(prev => [calculation, ...prev.slice(0, 9)]);
  };

  const scientificOperation = (func: string) => {
    const value = parseFloat(display);
    let result = 0;
    
    switch (func) {
      case 'sin':
        result = Math.sin(value * Math.PI / 180);
        break;
      case 'cos':
        result = Math.cos(value * Math.PI / 180);
        break;
      case 'tan':
        result = Math.tan(value * Math.PI / 180);
        break;
      case 'log':
        result = Math.log10(value);
        break;
      case 'ln':
        result = Math.log(value);
        break;
      case 'sqrt':
        result = Math.sqrt(value);
        break;
      case 'square':
        result = value * value;
        break;
      case 'cube':
        result = value * value * value;
        break;
      case 'factorial':
        result = value <= 0 ? 1 : Array.from({length: Math.floor(value)}, (_, i) => i + 1).reduce((a, b) => a * b, 1);
        break;
      case 'pi':
        result = Math.PI;
        break;
      case 'e':
        result = Math.E;
        break;
    }
    
    setDisplay(String(result));
  };

  const memoryStore = () => {
    setMemory(parseFloat(display));
    setShowMemory(true);
  };

  const memoryRecall = () => {
    setDisplay(String(memory));
  };

  const memoryClear = () => {
    setMemory(0);
    setShowMemory(false);
  };

  const memoryAdd = () => {
    setMemory(prev => prev + parseFloat(display));
  };

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
      setCurrentExpression(`${inputValue} ${nextOperation}`);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      
      setDisplay(String(newValue));
      setPreviousValue(newValue);
      setCurrentExpression(`${newValue} ${nextOperation}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      const calculation = `${previousValue} ${operation} ${inputValue} = ${newValue}`;
      
      setCurrentExpression(`${previousValue} ${operation} ${inputValue} =`);
      addToHistory(calculation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setCurrentExpression('');
  };

  const clearEntry = () => {
    setDisplay('0');
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const percentage = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  return (
    <div className={`calculator-app theme-${theme}`}>
      {/* Header */}
      <header className="app-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Back</span>
        </button>
        
        <div className="app-title">
          <svg className="title-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="4" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="9" y2="20" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h1>Smart Calculator</h1>
        </div>

        <div className="header-controls">
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'professional')}
            className="theme-selector"
          >
            <option value="professional">Professional</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>

          <button 
            className={`control-btn ${calculatorMode === 'programmer' ? 'active' : ''}`}
            onClick={() => setCalculatorMode(calculatorMode === 'standard' ? 'programmer' : 'standard')}
            title="Programmer Mode"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <text x="2" y="14" fontSize="10" fill="currentColor" fontFamily="monospace">01</text>
            </svg>
          </button>
          
          <button 
            className={`control-btn ${isScientific ? 'active' : ''}`}
            onClick={() => setIsScientific(!isScientific)}
            title="Scientific Mode"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <text x="3" y="14" fontSize="12" fill="currentColor">f(x)</text>
            </svg>
          </button>
          
          <button 
            className={`control-btn ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            title="History"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-content">
        {/* History Sidebar */}
        {showHistory && (
          <aside className="history-sidebar">
            <div className="sidebar-header">
              <h3>History</h3>
              <button className="clear-btn" onClick={() => setHistory([])}>Clear</button>
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="empty-message">No calculations yet</p>
              ) : (
                history.map((calc, index) => (
                  <div key={index} className="history-item" onClick={() => {
                    const result = calc.split(' = ')[1];
                    setDisplay(result);
                  }}>
                    {calc}
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Calculator */}
        <main className="calculator-main">
          {/* Display */}
          <div className="calculator-display">
            <div className="expression-line">
              {currentExpression || (showMemory && memory !== 0 ? `M: ${memory}` : '\u00A0')}
            </div>
            <div className="result-line">
              {display}
            </div>
          </div>

          {/* Scientific Panel */}
          {isScientific && (
            <div className="scientific-panel">
              <button className="sci-btn" onClick={() => scientificOperation('sin')}>sin</button>
              <button className="sci-btn" onClick={() => scientificOperation('cos')}>cos</button>
              <button className="sci-btn" onClick={() => scientificOperation('tan')}>tan</button>
              <button className="sci-btn" onClick={() => scientificOperation('log')}>log</button>
              <button className="sci-btn" onClick={() => scientificOperation('ln')}>ln</button>
              <button className="sci-btn" onClick={() => scientificOperation('sqrt')}>√</button>
              <button className="sci-btn" onClick={() => scientificOperation('square')}>x²</button>
              <button className="sci-btn" onClick={() => scientificOperation('cube')}>x³</button>
              <button className="sci-btn" onClick={() => scientificOperation('factorial')}>x!</button>
              <button className="sci-btn" onClick={() => scientificOperation('pi')}>π</button>
              <button className="sci-btn" onClick={() => scientificOperation('e')}>e</button>
            </div>
          )}

          {/* Programmer Panel */}
          {calculatorMode === 'programmer' && (
            <div className="programmer-panel">
              <div className="base-conversions">
                <div className="base-item">
                  <span className="base-label">HEX</span>
                  <span className="base-value">{parseInt(display || '0').toString(16).toUpperCase()}</span>
                </div>
                <div className="base-item">
                  <span className="base-label">DEC</span>
                  <span className="base-value">{parseInt(display || '0')}</span>
                </div>
                <div className="base-item">
                  <span className="base-label">OCT</span>
                  <span className="base-value">{parseInt(display || '0').toString(8)}</span>
                </div>
                <div className="base-item">
                  <span className="base-label">BIN</span>
                  <span className="base-value">{parseInt(display || '0').toString(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Memory Panel */}
          <div className="memory-panel">
            <button className="mem-btn" onClick={memoryClear}>MC</button>
            <button className="mem-btn" onClick={memoryRecall}>MR</button>
            <button className="mem-btn" onClick={memoryStore}>MS</button>
            <button className="mem-btn" onClick={memoryAdd}>M+</button>
          </div>

          {/* Keypad */}
          <div className="calculator-keypad">
            <button className="key key-function" onClick={clear}>AC</button>
            <button className="key key-function" onClick={clearEntry}>CE</button>
            <button className="key key-function" onClick={percentage}>%</button>
            <button className="key key-operator" onClick={() => inputOperation('÷')}>÷</button>

            <button className="key key-number" onClick={() => inputNumber('7')}>7</button>
            <button className="key key-number" onClick={() => inputNumber('8')}>8</button>
            <button className="key key-number" onClick={() => inputNumber('9')}>9</button>
            <button className="key key-operator" onClick={() => inputOperation('×')}>×</button>

            <button className="key key-number" onClick={() => inputNumber('4')}>4</button>
            <button className="key key-number" onClick={() => inputNumber('5')}>5</button>
            <button className="key key-number" onClick={() => inputNumber('6')}>6</button>
            <button className="key key-operator" onClick={() => inputOperation('-')}>−</button>

            <button className="key key-number" onClick={() => inputNumber('1')}>1</button>
            <button className="key key-number" onClick={() => inputNumber('2')}>2</button>
            <button className="key key-number" onClick={() => inputNumber('3')}>3</button>
            <button className="key key-operator" onClick={() => inputOperation('+')}>+</button>

            <button className="key key-number key-zero" onClick={() => inputNumber('0')}>0</button>
            <button className="key key-function" onClick={inputDecimal}>.</button>
            <button className="key key-function" onClick={toggleSign}>±</button>
            <button className="key key-equals" onClick={performCalculation}>=</button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Calculator;