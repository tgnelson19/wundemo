import React, { useState, useEffect } from 'react';
import { Zap, Power, Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PowerDiagramDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Initialize breakers state
  const [breakers, setBreakers] = useState({
    main1: { closed: true, voltage: 13800, current: 245, power: 5850 },
    main2: { closed: true, voltage: 13800, current: 238, power: 5680 },
    tie: { closed: false, voltage: 0, current: 0, power: 0 },
    feeder1: { closed: true, voltage: 4160, current: 145, power: 1040 },
    feeder2: { closed: true, voltage: 4160, current: 132, power: 950 },
    gen1: { closed: true, voltage: 4160, current: -85, power: -610 }, // Negative = generating
    feeder4: { closed: true, voltage: 4160, current: 156, power: 1120 },
    feeder5: { closed: true, voltage: 4160, current: 168, power: 1210 },
    gen2: { closed: true, voltage: 4160, current: -92, power: -660 }, // Negative = generating
    feeder7: { closed: true, voltage: 4160, current: 138, power: 990 },
  });

  const [powerHistory, setPowerHistory] = useState([]);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Determine power flow
      const hasMainBusPower = breakers.main1.closed || breakers.main2.closed;
      const hasBusAPower = breakers.main1.closed || (breakers.tie.closed && breakers.main2.closed) || (breakers.gen1.closed && !hasMainBusPower);
      const hasBusBPower = breakers.main2.closed || (breakers.tie.closed && breakers.main1.closed) || (breakers.gen2.closed && !hasMainBusPower);
      
      // Simulate slight variations in electrical parameters
      setBreakers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key].closed) {
            const isMain = key.includes('main');
            const isGen = key.includes('gen');
            const baseVoltage = isMain ? 13800 : 4160;
            
            if (isGen) {
              // Generators produce negative power (supplying to grid)
              const genPower = -600 - Math.random() * 100;
              updated[key] = {
                ...updated[key],
                voltage: baseVoltage + (Math.random() - 0.5) * 50,
                current: genPower / (baseVoltage / 1000),
                power: genPower,
              };
            } else if (key !== 'tie') {
              updated[key] = {
                ...updated[key],
                voltage: baseVoltage + (Math.random() - 0.5) * (isMain ? 200 : 50),
                current: updated[key].current + (Math.random() - 0.5) * 10,
                power: updated[key].power + (Math.random() - 0.5) * 50,
              };
            }
          }
        });
        return updated;
      });

      // Update power history
      setPowerHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          main1: breakers.main1.closed ? breakers.main1.power : 0,
          main2: breakers.main2.closed ? breakers.main2.power : 0,
          gen1: breakers.gen1.closed ? Math.abs(breakers.gen1.power) : 0,
          gen2: breakers.gen2.closed ? Math.abs(breakers.gen2.power) : 0,
        };
        const updated = [...prev, newEntry];
        return updated.slice(-15); // Keep last 15 data points
      });

      // Update rotation for animations
      setRotation(prev => (prev + 10) % 360);
    }, 2000);
    
    return () => clearInterval(timer);
  }, [breakers]);

  const toggleBreaker = (breakerId) => {
    setBreakers(prev => {
      const breaker = prev[breakerId];
      const newClosed = !breaker.closed;
      
      if (newClosed) {
        // Breaker closing - restore nominal values
        const isMain = breakerId.includes('main');
        const isTie = breakerId === 'tie';
        const isGen = breakerId.includes('gen');
        
        if (isGen) {
          return {
            ...prev,
            [breakerId]: {
              closed: true,
              voltage: 4160,
              current: -80 - Math.random() * 20,
              power: -600 - Math.random() * 100,
            }
          };
        }
        
        return {
          ...prev,
          [breakerId]: {
            closed: true,
            voltage: isMain ? 13800 : (isTie ? 4160 : 4160),
            current: isMain ? 240 : (isTie ? 50 + Math.random() * 20 : 140 + Math.random() * 30),
            power: isMain ? 5700 : (isTie ? 300 + Math.random() * 100 : 1000 + Math.random() * 200),
          }
        };
      } else {
        // Breaker opening - zero all values
        return {
          ...prev,
          [breakerId]: {
            closed: false,
            voltage: 0,
            current: 0,
            power: 0,
          }
        };
      }
    });
  };

  // Determine power flow for each section
  const hasMainBusPower = breakers.main1.closed || breakers.main2.closed;
  const hasBusAPower = breakers.main1.closed || (breakers.tie.closed && breakers.main2.closed) || breakers.gen1.closed || (breakers.tie.closed && breakers.gen2.closed);
  const hasBusBPower = breakers.main2.closed || (breakers.tie.closed && breakers.main1.closed) || breakers.gen2.closed || (breakers.tie.closed && breakers.gen1.closed);

  const Breaker = ({ id, label, closed, onClick, x, y, isTie = false, power = 0 }) => {
    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        {/* Breaker symbol - perfect square */}
        <rect
          x={x - 20}
          y={y - 20}
          width="40"
          height="40"
          fill={closed ? '#ef4444' : '#10b981'}
          stroke="#ffffff"
          strokeWidth="2.5"
          rx="0"
          className="transition-all duration-300 drop-shadow-lg"
        />
        
        {/* Breaker contacts - tie breaker has reversed logic */}
        {isTie ? (
          closed ? (
            // Tie closed = horizontal line
            <line x1={x - 12} y1={y} x2={x + 12} y2={y} stroke="#fff" strokeWidth="4" />
          ) : (
            // Tie open = vertical line
            <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke="#fff" strokeWidth="4" />
          )
        ) : (
          closed ? (
            // Normal closed = vertical line
            <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke="#fff" strokeWidth="4" />
          ) : (
            // Normal open = horizontal line
            <line x1={x - 12} y1={y} x2={x + 12} y2={y} stroke="#fff" strokeWidth="4" />
          )
        )}
        
        <text
          x={x}
          y={y + 45}
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize="13"
          fontWeight="600"
          className="select-none"
        >
          {label}
        </text>
        
        {/* Power flow indicator */}
        <text
          x={x}
          y={y + 58}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize="11"
          fontWeight="600"
          className="select-none"
        >
          {closed ? `${Math.abs(power).toFixed(0)} kW` : '0 kW'}
        </text>
        
        <circle
          cx={x + 28}
          cy={y - 28}
          r="5"
          fill={closed ? '#fca5a5' : '#86efac'}
          className="animate-pulse"
        />
      </g>
    );
  };

  const Motor = ({ x, y, rotating, power = 0 }) => {
    return (
      <g>
        <circle cx={x} cy={y} r="22" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
        <text x={x} y={y + 5} textAnchor="middle" fill="#f59e0b" fontSize="18" fontWeight="700">
          M
        </text>
        {rotating && (
          <g transform={`rotate(${rotation} ${x} ${y})`}>
            <line x1={x} y1={y - 15} x2={x} y2={y + 15} stroke="#f59e0b" strokeWidth="2" opacity="0.6" />
            <line x1={x - 15} y1={y} x2={x + 15} y2={y} stroke="#f59e0b" strokeWidth="2" opacity="0.6" />
          </g>
        )}
        {/* Power label */}
        <text
          x={x}
          y={y + 40}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize="11"
          fontWeight="600"
        >
          {rotating ? `${Math.abs(power).toFixed(0)} kW` : '0 kW'}
        </text>
      </g>
    );
  };

  const Generator = ({ x, y, generating, power = 0 }) => {
    return (
      <g>
        <circle cx={x} cy={y} r="22" fill="none" stroke="#10b981" strokeWidth="3.5" />
        <text x={x} y={y + 5} textAnchor="middle" fill="#10b981" fontSize="18" fontWeight="700">
          G
        </text>
        {generating && (
          <>
            <g transform={`rotate(${-rotation} ${x} ${y})`}>
              <line x1={x} y1={y - 15} x2={x} y2={y + 15} stroke="#10b981" strokeWidth="2" opacity="0.6" />
              <line x1={x - 15} y1={y} x2={x + 15} y2={y} stroke="#10b981" strokeWidth="2" opacity="0.6" />
            </g>
            <circle cx={x + 20} cy={y - 20} r="3" fill="#22c55e" className="animate-pulse" />
          </>
        )}
        {/* Power label */}
        <text
          x={x}
          y={y + 40}
          textAnchor="middle"
          fill="#22c55e"
          fontSize="11"
          fontWeight="600"
        >
          {generating ? `${Math.abs(power).toFixed(0)} kW` : '0 kW'}
        </text>
      </g>
    );
  };

  const totalPower = Object.values(breakers).reduce((sum, b) => sum + (b.closed ? b.power : 0), 0);
  const closedCount = Object.values(breakers).filter(b => b.closed).length;
  const totalGeneration = Math.abs(breakers.gen1.power) + Math.abs(breakers.gen2.power);

  const breakerLabels = {
    main1: 'Main 1',
    main2: 'Main 2',
    tie: 'Tie Breaker',
    feeder1: 'Feeder 1',
    feeder2: 'Feeder 2',
    gen1: 'Generator 1',
    feeder4: 'Feeder 4',
    feeder5: 'Feeder 5',
    gen2: 'Generator 2',
    feeder7: 'Feeder 7',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                <Zap className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Power Distribution</h1>
                <p className="text-gray-400 text-sm mt-0.5">One-Line Diagram Control System</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="text-sm text-gray-400">System Time</div>
                <div className="text-xl font-semibold text-white font-mono">
                  {currentTime.toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-800/50 px-5 py-3 rounded-xl border border-gray-700">
                <Activity className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="text-sm font-semibold text-emerald-400">ONLINE</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs font-medium mb-1">Breakers Active</div>
                  <div className="text-2xl font-bold text-white">{closedCount}<span className="text-gray-500 text-lg">/10</span></div>
                </div>
                <Power className="w-8 h-8 text-blue-400 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs font-medium mb-1">Net Power</div>
                  <div className="text-2xl font-bold text-white">{totalPower.toFixed(0)}<span className="text-gray-500 text-sm"> kW</span></div>
                </div>
                <Zap className="w-8 h-8 text-yellow-400 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs font-medium mb-1">Generation</div>
                  <div className="text-2xl font-bold text-emerald-400">{totalGeneration.toFixed(0)}<span className="text-gray-500 text-sm"> kW</span></div>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-400 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs font-medium mb-1">Bus A</div>
                  <div className={`text-xl font-bold ${hasBusAPower ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hasBusAPower ? 'ENERGIZED' : 'DE-ENERGIZED'}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-xs font-medium mb-1">Bus B</div>
                  <div className={`text-xl font-bold ${hasBusBPower ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hasBusBPower ? 'ENERGIZED' : 'DE-ENERGIZED'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* One-Line Diagram */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span className="text-gray-300 font-medium text-sm">
                Click breakers to toggle • <span className="text-red-400 font-semibold">RED</span> = Closed/Energized • <span className="text-emerald-400 font-semibold">GREEN</span> = Open/De-energized
              </span>
            </div>
            
            <svg width="100%" height="700" viewBox="0 0 1400 700" className="drop-shadow-2xl">
              {/* Utility Connection */}
              <text x="700" y="30" textAnchor="middle" fill="#60a5fa" fontSize="15" fontWeight="600">
                ⚡ UTILITY 13.8kV
              </text>
              <line x1="700" y1="45" x2="700" y2="85" stroke={hasMainBusPower ? '#ef4444' : '#10b981'} strokeWidth="5" strokeLinecap="round" />
              
              {/* Main Bus */}
              <line x1="450" y1="85" x2="950" y2="85" stroke={hasMainBusPower ? '#ef4444' : '#10b981'} strokeWidth="8" strokeLinecap="round" />
              <text x="360" y="82" fill="#60a5fa" fontSize="13" fontWeight="600">MAIN BUS</text>
              
              {/* Main Breaker 1 */}
              <line x1="575" y1="85" x2="575" y2="135" stroke={hasMainBusPower ? '#ef4444' : '#10b981'} strokeWidth="5" strokeLinecap="round" />
              <Breaker
                id="main1"
                label="MAIN 1"
                closed={breakers.main1.closed}
                onClick={() => toggleBreaker('main1')}
                x={575}
                y={170}
                power={breakers.main1.power}
              />
              <line x1="575" y1="205" x2="575" y2="255" stroke={breakers.main1.closed ? '#ef4444' : '#10b981'} strokeWidth="5" strokeLinecap="round" />
              
              {/* Main Breaker 2 */}
              <line x1="825" y1="85" x2="825" y2="135" stroke={hasMainBusPower ? '#ef4444' : '#10b981'} strokeWidth="5" strokeLinecap="round" />
              <Breaker
                id="main2"
                label="MAIN 2"
                closed={breakers.main2.closed}
                onClick={() => toggleBreaker('main2')}
                x={825}
                y={170}
                power={breakers.main2.power}
              />
              <line x1="825" y1="205" x2="825" y2="255" stroke={breakers.main2.closed ? '#ef4444' : '#10b981'} strokeWidth="5" strokeLinecap="round" />
              
              {/* Distribution Bus A */}
              <line x1="250" y1="255" x2="650" y2="255" stroke={hasBusAPower ? '#ef4444' : '#10b981'} strokeWidth="7" strokeLinecap="round" />
              <text x="160" y="252" fill="#34d399" fontSize="13" fontWeight="600">BUS A</text>
              
              {/* Tie Breaker */}
              <line x1="650" y1="255" x2="670" y2="255" stroke={hasBusAPower ? '#ef4444' : '#10b981'} strokeWidth="5" strokeLinecap="round" />
              <Breaker
                id="tie"
                label="TIE"
                closed={breakers.tie.closed}
                onClick={() => toggleBreaker('tie')}
                x={700}
                y={255}
                isTie={true}
                power={breakers.tie.power}
              />
              <line x1="730" y1="255" x2="750" y2="255" stroke={hasBusBPower ? '#ef4444' : '#10b981'} strokeWidth="5" strokeLinecap="round" />
              
              {/* Distribution Bus B */}
              <line x1="750" y1="255" x2="1150" y2="255" stroke={hasBusBPower ? '#ef4444' : '#10b981'} strokeWidth="7" strokeLinecap="round" />
              <text x="1170" y="252" fill="#34d399" fontSize="13" fontWeight="600">BUS B</text>
              
              {/* Feeder 1 */}
              <line x1="300" y1="255" x2="300" y2="335" stroke={hasBusAPower ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Breaker
                id="feeder1"
                label="FDR 1"
                closed={breakers.feeder1.closed}
                onClick={() => toggleBreaker('feeder1')}
                x={300}
                y={370}
                power={breakers.feeder1.power}
              />
              <line x1="300" y1="405" x2="300" y2="510" stroke={hasBusAPower && breakers.feeder1.closed ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Motor x={300} y={545} rotating={hasBusAPower && breakers.feeder1.closed} power={breakers.feeder1.power} />
              <text x="300" y="595" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="500">LOAD 1</text>
              
              {/* Feeder 2 */}
              <line x1="400" y1="255" x2="400" y2="335" stroke={hasBusAPower ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Breaker
                id="feeder2"
                label="FDR 2"
                closed={breakers.feeder2.closed}
                onClick={() => toggleBreaker('feeder2')}
                x={400}
                y={370}
                power={breakers.feeder2.power}
              />
              <line x1="400" y1="405" x2="400" y2="510" stroke={hasBusAPower && breakers.feeder2.closed ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Motor x={400} y={545} rotating={hasBusAPower && breakers.feeder2.closed} power={breakers.feeder2.power} />
              <text x="400" y="595" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="500">LOAD 2</text>
              
              {/* Generator 1 */}
              <line x1="500" y1="255" x2="500" y2="335" stroke={hasBusAPower ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Breaker
                id="gen1"
                label="GEN 1"
                closed={breakers.gen1.closed}
                onClick={() => toggleBreaker('gen1')}
                x={500}
                y={370}
                power={breakers.gen1.power}
              />
              <line x1="500" y1="405" x2="500" y2="510" stroke={breakers.gen1.closed ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Generator x={500} y={545} generating={breakers.gen1.closed} power={breakers.gen1.power} />
              <text x="500" y="595" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="500">GEN 1</text>
              
              {/* Feeder 4 */}
              <line x1="600" y1="255" x2="600" y2="335" stroke={hasBusAPower ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Breaker
                id="feeder4"
                label="FDR 4"
                closed={breakers.feeder4.closed}
                onClick={() => toggleBreaker('feeder4')}
                x={600}
                y={370}
                power={breakers.feeder4.power}
              />
              <line x1="600" y1="405" x2="600" y2="510" stroke={hasBusAPower && breakers.feeder4.closed ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Motor x={600} y={545} rotating={hasBusAPower && breakers.feeder4.closed} power={breakers.feeder4.power} />
              <text x="600" y="595" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="500">LOAD 4</text>
              
              {/* Feeder 5 */}
              <line x1="800" y1="255" x2="800" y2="335" stroke={hasBusBPower ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Breaker
                id="feeder5"
                label="FDR 5"
                closed={breakers.feeder5.closed}
                onClick={() => toggleBreaker('feeder5')}
                x={800}
                y={370}
                power={breakers.feeder5.power}
              />
              <line x1="800" y1="405" x2="800" y2="510" stroke={hasBusBPower && breakers.feeder5.closed ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Motor x={800} y={545} rotating={hasBusBPower && breakers.feeder5.closed} power={breakers.feeder5.power} />
              <text x="800" y="595" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="500">LOAD 5</text>
              
              {/* Generator 2 */}
              <line x1="900" y1="255" x2="900" y2="335" stroke={hasBusBPower ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Breaker
                id="gen2"
                label="GEN 2"
                closed={breakers.gen2.closed}
                onClick={() => toggleBreaker('gen2')}
                x={900}
                y={370}
                power={breakers.gen2.power}
              />
              <line x1="900" y1="405" x2="900" y2="510" stroke={breakers.gen2.closed ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Generator x={900} y={545} generating={breakers.gen2.closed} power={breakers.gen2.power} />
              <text x="900" y="595" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="500">GEN 2</text>
              
              {/* Feeder 7 */}
              <line x1="1000" y1="255" x2="1000" y2="335" stroke={hasBusBPower ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Breaker
                id="feeder7"
                label="FDR 7"
                closed={breakers.feeder7.closed}
                onClick={() => toggleBreaker('feeder7')}
                x={1000}
                y={370}
                power={breakers.feeder7.power}
              />
              <line x1="1000" y1="405" x2="1000" y2="510" stroke={hasBusBPower && breakers.feeder7.closed ? '#ef4444' : '#10b981'} strokeWidth="4" strokeLinecap="round" />
              <Motor x={1000} y={545} rotating={hasBusBPower && breakers.feeder7.closed} power={breakers.feeder7.power} />
              <text x="1000" y="595" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="500">LOAD 7</text>
            </svg>
          </div>
        </div>

        {/* Power Generation Chart */}
        <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 shadow-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Power Generation History
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={powerHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Legend />
              <Line type="monotone" dataKey="main1" stroke="#3b82f6" strokeWidth={2} name="Main 1" dot={false} />
              <Line type="monotone" dataKey="main2" stroke="#8b5cf6" strokeWidth={2} name="Main 2" dot={false} />
              <Line type="monotone" dataKey="gen1" stroke="#10b981" strokeWidth={2} name="Generator 1" dot={false} />
              <Line type="monotone" dataKey="gen2" stroke="#22c55e" strokeWidth={2} name="Generator 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Breaker Data Dashboard */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Breaker Telemetry
          </h2>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(breakers).map(([id, data]) => {
              const isGen = id.includes('gen');
              return (
                <div
                  key={id}
                  className={`bg-gradient-to-br rounded-xl p-5 border shadow-lg transition-all duration-300 ${
                    data.closed
                      ? isGen 
                        ? 'from-emerald-950/50 to-emerald-900/30 border-emerald-800/50 shadow-emerald-900/20'
                        : 'from-red-950/50 to-red-900/30 border-red-800/50 shadow-red-900/20'
                      : 'from-gray-800 to-gray-900 border-gray-700 shadow-gray-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold text-sm">{breakerLabels[id]}</h3>
                    <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      data.closed 
                        ? isGen
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {data.closed ? 'CLOSED' : 'OPEN'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">Voltage</span>
                      <span className="text-blue-400 font-semibold text-sm font-mono">
                        {data.voltage.toFixed(0)} V
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">Current</span>
                      <span className="text-emerald-400 font-semibold text-sm font-mono">
                        {data.current.toFixed(1)} A
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">Power</span>
                      <span className={`font-semibold text-sm font-mono ${isGen ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {isGen ? Math.abs(data.power).toFixed(0) : data.power.toFixed(0)} kW {isGen && '↑'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerDiagramDashboard;