import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Calculator.css';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'glassmorphism' | 'liquid' | 'minimal'>('minimal');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isScientific, setIsScientific] = useState(false);
  const [memory, setMemory] = useState(0);
  const [showMemory, setShowMemory] = useState(false);
  const [showCalculationSteps, setShowCalculationSteps] = useState(true);
  const [calculatorMode, setCalculatorMode] = useState<'standard' | 'programmer' | 'graphing'>('standard');
  const [isAnimated, setIsAnimated] = useState(true);
  const navigate = useNavigate();

  // Remove voice functionality and add better calculation display
  const formatCalculation = (prev: number, op: string, curr: string) => {
    return `${prev} ${op} ${curr}`;
  };

  // Add calculation steps tracking
  const [currentExpression, setCurrentExpression] = useState<string>('');

  // Add to history
  const addToHistory = (calculation: string) => {
    setHistory(prev => [calculation, ...prev.slice(0, 9)]); // Keep last 10 calculations
  };

  // Scientific functions
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

  // Memory functions
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
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      const calculation = `${previousValue} ${operation} ${inputValue} = ${newValue}`;
      
      // Show the complete expression with equals
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
    <div className={`calculator-container theme-${theme}`}>
      <div className="calculator-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <span>←</span> Back to Home
        </button>
        <h1 className="calculator-title">
          <span className="calc-icon">⚡</span>
          Smart Calculator
        </h1>
        
        {/* Theme and Feature Toggles */}
        <div className="feature-toggles">
          <div className="theme-selector">
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'glassmorphism' | 'liquid' | 'minimal')}
              className="theme-select"
            >
              <option value="minimal">Minimal</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="glassmorphism">Glass Dark</option>
              <option value="liquid">Liquid Dark</option>
            </select>
          </div>
          
          <button 
            className={`toggle-btn ${calculatorMode !== 'standard' ? 'active' : ''}`}
            onClick={() => setCalculatorMode(calculatorMode === 'standard' ? 'programmer' : 'standard')}
            title="Toggle Programmer Mode"
          >
            <span className="icon">BIN</span>
          </button>
          
          <button 
            className={`toggle-btn ${isScientific ? 'active' : ''}`}
            onClick={() => setIsScientific(!isScientific)}
            title="Toggle Scientific Mode"
          >
            <span className="icon">f(x)</span>
          </button>
          
          <button 
            className={`toggle-btn ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            title="Toggle History"
          >
            <span className="icon">H</span>
          </button>

          <button 
            className={`toggle-btn ${isAnimated ? 'active' : ''}`}
            onClick={() => setIsAnimated(!isAnimated)}
            title="Toggle Animations"
          >
            <span className="icon">FX</span>
          </button>
        </div>
      </div>

      <div className="calculator-layout">
        {/* History Panel */}
        {showHistory && (
          <div className="history-panel">
            <h3>History</h3>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="no-history">No calculations yet</p>
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
            <button className="clear-history" onClick={() => {
              setHistory([]);
            }}>
              Clear History
            </button>
          </div>
        )}

        <div className="calculator">
          <div className="calculator-display">
            <div className="display-container">
              {/* Top line: Shows the expression like "78 × 99 =" */}
              <div className="expression-display">
                {currentExpression ? (
                  <span className="expression-text">{currentExpression}</span>
                ) : showMemory && memory !== 0 ? (
                  <span className="memory-indicator">M: {memory}</span>
                ) : (
                  <span className="placeholder">&nbsp;</span>
                )}
              </div>
              
              {/* Bottom line: Shows the large result like "7,722" */}
              <div className="result-display">
                <span className="result-value">{display}</span>
              </div>
            </div>
          </div>

          {/* Scientific Functions Panel */}
          {isScientific && (
            <div className="scientific-panel">
              <button className="btn btn-scientific" onClick={() => scientificOperation('sin')}>sin</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('cos')}>cos</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('tan')}>tan</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('log')}>log</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('ln')}>ln</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('sqrt')}>√</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('square')}>x²</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('cube')}>x³</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('factorial')}>x!</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('pi')}>π</button>
              <button className="btn btn-scientific" onClick={() => scientificOperation('e')}>e</button>
            </div>
          )}

          {/* Programmer Mode Panel */}
          {calculatorMode === 'programmer' && (
            <div className="programmer-panel">
              <div className="number-systems">
                <div className="system-row">
                  <span className="system-label">HEX:</span>
                  <span className="system-value">{parseInt(display || '0').toString(16).toUpperCase()}</span>
                </div>
                <div className="system-row">
                  <span className="system-label">DEC:</span>
                  <span className="system-value">{parseInt(display || '0')}</span>
                </div>
                <div className="system-row">
                  <span className="system-label">OCT:</span>
                  <span className="system-value">{parseInt(display || '0').toString(8)}</span>
                </div>
                <div className="system-row">
                  <span className="system-label">BIN:</span>
                  <span className="system-value">{parseInt(display || '0').toString(2)}</span>
                </div>
              </div>
              <div className="bitwise-operations">
                <button className="btn btn-bitwise" onClick={() => setDisplay(String(parseInt(display) & parseInt('255')))}>AND</button>
                <button className="btn btn-bitwise" onClick={() => setDisplay(String(parseInt(display) | parseInt('255')))}>OR</button>
                <button className="btn btn-bitwise" onClick={() => setDisplay(String(parseInt(display) ^ parseInt('255')))}>XOR</button>
                <button className="btn btn-bitwise" onClick={() => setDisplay(String(~parseInt(display)))}>NOT</button>
                <button className="btn btn-bitwise" onClick={() => setDisplay(String(parseInt(display) << 1))}>{'<<'}</button>
                <button className="btn btn-bitwise" onClick={() => setDisplay(String(parseInt(display) >> 1))}>{'>>'}
                </button>
              </div>
            </div>
          )}

          {/* Memory Functions */}
          <div className="memory-panel">
            <button className="btn btn-memory" onClick={() => {
              memoryClear();
            }} title="Memory Clear">MC</button>
            <button className="btn btn-memory" onClick={() => {
              memoryRecall();
            }} title="Memory Recall">MR</button>
            <button className="btn btn-memory" onClick={() => {
              memoryStore();
            }} title="Memory Store">MS</button>
            <button className="btn btn-memory" onClick={() => {
              memoryAdd();
            }} title="Memory Add">M+</button>
          </div>

          <div className="calculator-keypad">
            {/* Row 1 */}
            <button className="btn btn-function" onClick={() => {
              clear();
            }}>
              AC
            </button>
            <button className="btn btn-function" onClick={() => {
              clearEntry();
            }}>
              CE
            </button>
            <button className="btn btn-function" onClick={() => {
              percentage();
            }}>
              %
            </button>
            <button className="btn btn-operator" onClick={() => {
              inputOperation('÷');
            }}>
              ÷
            </button>

            {/* Row 2 */}
            <button className="btn btn-number" onClick={() => inputNumber('7')}>
              7
            </button>
            <button className="btn btn-number" onClick={() => inputNumber('8')}>
              8
            </button>
            <button className="btn btn-number" onClick={() => inputNumber('9')}>
              9
            </button>
            <button className="btn btn-operator" onClick={() => {
              inputOperation('×');
            }}>
              ×
            </button>

            {/* Row 3 */}
            <button className="btn btn-number" onClick={() => inputNumber('4')}>
              4
            </button>
            <button className="btn btn-number" onClick={() => inputNumber('5')}>
              5
            </button>
            <button className="btn btn-number" onClick={() => inputNumber('6')}>
              6
            </button>
            <button className="btn btn-operator" onClick={() => {
              inputOperation('-');
            }}>
              −
            </button>

            {/* Row 4 */}
            <button className="btn btn-number" onClick={() => inputNumber('1')}>
              1
            </button>
            <button className="btn btn-number" onClick={() => inputNumber('2')}>
              2
            </button>
            <button className="btn btn-number" onClick={() => inputNumber('3')}>
              3
            </button>
            <button className="btn btn-operator" onClick={() => {
              inputOperation('+');
            }}>
              +
            </button>

            {/* Row 5 */}
            <button className="btn btn-number btn-zero" onClick={() => inputNumber('0')}>
              0
            </button>
            <button className="btn btn-function" onClick={() => {
              inputDecimal();
            }}>
              .
            </button>
            <button className="btn btn-function" onClick={() => {
              toggleSign();
            }}>
              ±
            </button>
            <button className="btn btn-equals" onClick={() => {
              performCalculation();
            }}>
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;