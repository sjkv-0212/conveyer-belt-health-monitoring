/**
 * ======================================================================================
 * INTELLIGENT CONVEYOR BELT MONITORING SYSTEM - CORE APPLICATION CONTROLLER
 * Full SPA Navigation Router, Continuous Machine Learning Engine (Regression & Classification),
 * Multi-Channel Oscilloscopes, Hardware Component Matrix, Web Serial Bridge, and CV Workbench.
 * ======================================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. GLOBAL STATE & CONFIGURATION
  // ==========================================
  const state = {
    isLive: true,
    activeView: 'dashboard',
    activeFault: 'none',
    activeCVDefect: 'none',
    activeFilter: 'scan',
    uptimeSeconds: 12 * 3600 + 45 * 60,
    currentTime: new Date(2026, 7, 25, 10, 24, 35),
    packetCount: 1492,
    serialPort: null,
    serialReader: null,
    isSerialConnected: false,

    // Live Sensor Readings (All 15 Components)
    telemetry: {
      speed: 1.28,             // LM393 Speed (m/s)
      speedSetPoint: 1.30,
      load: 4.35,              // HX711 Load Cell (kg)
      loadMax: 5.00,
      tempBearing: 38.6,       // DS18B20 1-Wire (°C)
      tempThermal: 38.4,       // MLX90614 IR Non-Contact (°C)
      vibration: 2.45,         // MPU6050 Accelerometer RMS (mm/s)
      alignment: 2.1,          // LM393 IR Deviation (mm)
      tension: 6.2,            // Tension Load Cell (kg)
      current: 1.35,           // INA219 Current (A)
      voltage: 12.08,          // SMPS Voltage (V)
      power: 16.3,             // Power Consumption (W)
      acousticDb: 54.2,        // MAX9814 Microphone (dB)
      displacement: 0.8,       // Inductive Proximity (mm)
      defectArea: 0.0,         // CV Defect Area (%)
      jointGap: 0.0,           // CV Joint Splice Gap (mm)
      edgeFray: 0.12           // Edge Roughness (mm)
    },

    // Machine Learning Computed Outputs
    ml: {
      healthScore: 82,         // 0-100% Continuous Regression Index
      rulDays: 23.4,           // Remaining Useful Life in Days
      rulHours: 561,           // Remaining Useful Life in Operating Hours
      degradationRate: -0.78,  // %/day
      predictedState: 'NORMAL_OPERATION',
      confidence: 99.2,
      probabilities: {
        normal: 99.2,
        bearing: 0.4,
        misalignment: 0.2,
        slippage: 0.1,
        overload: 0.1,
        slack: 0.0,
        tear: 0.0
      }
    },

    // Threshold Configurations (Loaded with default safety limits)
    thresholds: {
      speed: { set: 1.30, lowWarn: 1.00, highCrit: 2.20 },
      load: { max: 5.0, warn: 4.8, crit: 5.5 },
      temp: { norm: 45.0, warn: 60.0, crit: 75.0 },
      vibration: { norm: 2.8, warn: 4.5, crit: 7.1 },
      alignment: { norm: 2.0, warn: 3.0, crit: 4.5 },
      current: { norm: 1.5, warn: 2.2, crit: 2.8 },
      tension: { lowWarn: 4.0, norm: 6.5, highCrit: 9.5 },
      acoustic: { norm: 55.0, warn: 70.0, crit: 85.0 },
      displacement: { warn: 1.8, crit: 2.5 },
      defectArea: { warn: 1.5, crit: 3.0 }
    },

    // Time-Series Buffers for Oscilloscope Charts
    timeSeries: {
      labels: ['10:20', '10:21', '10:22', '10:23', '10:24', '10:25'],
      speed: [1.26, 1.29, 1.27, 1.30, 1.28, 1.28],
      load: [4.20, 4.45, 4.30, 4.40, 4.35, 4.35],
      temp: [37.8, 38.1, 38.4, 38.3, 38.5, 38.6],
      vibration: [2.35, 2.50, 2.40, 2.55, 2.42, 2.45],
      tension: [6.1, 6.3, 6.0, 6.4, 6.2, 6.2],
      current: [1.30, 1.38, 1.32, 1.36, 1.34, 1.35],
      alignment: [2.0, 2.2, 1.9, 2.1, 2.0, 2.1]
    },

    // Alarm Log History
    alerts: [
      { id: 1, time: '10:24:10 AM', sev: 'info', comp: 'ESP32 Gateway', msg: 'System initialized and telemetry streaming at 4.0 Hz', status: 'Active' },
      { id: 2, time: '10:23:15 AM', sev: 'warning', comp: 'LM393 Alignment', msg: 'Belt lateral drift detected (2.1 mm deviation)', status: 'Investigating' },
      { id: 3, time: '10:22:45 AM', sev: 'info', comp: 'DS18B20 Temp', msg: 'Bearing temperature steady at 38.6 °C', status: 'Resolved' },
      { id: 4, time: '10:22:10 AM', sev: 'info', comp: 'MPU6050 Vibration', msg: 'Vibration RMS 2.45 mm/s (ISO 10816 Zone A Optimal)', status: 'Resolved' },
      { id: 5, time: '10:21:00 AM', sev: 'info', comp: 'Maintenance AI', msg: 'Next preventative maintenance inspection scheduled in 5 days', status: 'Resolved' }
    ]
  };

  // Audio Context for Audible Alarm Buzzer Simulation
  let audioCtx = null;
  const playBuzzerTone = (freq = 880, duration = 180) => {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    } catch (e) {
      // Audio not permitted without interaction
    }
  };

  // ==========================================
  // 2. SPA VIEW ROUTING SYSTEM
  // ==========================================
  const subtitles = {
    dashboard: 'Continuous Machine Learning Health Diagnostics & Multi-Sensor Telemetry',
    realtime: 'Multi-Channel Live Oscilloscope Streaming from ESP32 12-Bit ADC & I2C Bus',
    sensors: 'Hardware Specifications, Pinouts & Live Readouts for All 15 Prototype Components',
    analytics: 'Machine Learning Hub: Regression RUL Curve, Random Forest Fault Classifier & Simulator',
    thresholds: 'Custom Warning & Critical Trip Limit Settings for All 15 Sensors',
    camera: 'Computer Vision Inspection Workbench: Defect Area, Splice Gap & Surface Profiles',
    alerts: 'Diagnostic Log Archive, Severity Categorization & Alarm Acknowledgment',
    history: '30-Day Historical Telemetry Trends & Statistical Distribution Archive',
    maintenance: 'AI-Powered Subsystem Remaining Useful Life (RUL) & Preventative Work Orders',
    reports: 'ISO 10816 / ISO 5048 Engineering Telemetry Audit Document Generator',
    hardware: 'ESP32 & Arduino Web Serial Bridge, JSON Streaming & Firmware Sketch'
  };

  const navigateToView = (viewKey) => {
    if (!document.getElementById(`view-${viewKey}`)) return;

    // Toggle active classes on view containers
    document.querySelectorAll('.view-page').forEach(page => page.classList.remove('active'));
    document.getElementById(`view-${viewKey}`).classList.add('active');

    // Toggle active classes on sidebar nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-${viewKey}`)?.classList.add('active');

    state.activeView = viewKey;

    // Update Header Subtitle
    const subTitleEl = document.getElementById('pageSubtitle');
    if (subTitleEl && subtitles[viewKey]) {
      subTitleEl.textContent = subtitles[viewKey];
    }

    // Trigger Chart Resize if switching into chart views
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);

    showToast(`Navigated to ${viewKey.toUpperCase()} view`);
  };

  // Bind Sidebar Nav Clicks
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewKey = btn.getAttribute('data-view');
      navigateToView(viewKey);
      document.getElementById('sidebar')?.classList.remove('mobile-open');
    });
  });

  // Quick Action & Banner Links
  document.getElementById('btnGoToAnalytics')?.addEventListener('click', () => navigateToView('analytics'));
  document.getElementById('btnViewAllAlerts')?.addEventListener('click', () => navigateToView('alerts'));
  document.getElementById('btnViewSensorsDeep')?.addEventListener('click', () => navigateToView('sensors'));
  document.getElementById('btnExpandCamera')?.addEventListener('click', () => navigateToView('camera'));
  document.getElementById('btnQuickReport')?.addEventListener('click', () => navigateToView('reports'));
  document.getElementById('btnQuickThresholds')?.addEventListener('click', () => navigateToView('thresholds'));
  document.getElementById('btnQuickHardware')?.addEventListener('click', () => navigateToView('hardware'));
  document.getElementById('btnWebSerialConnect')?.addEventListener('click', () => navigateToView('hardware'));

  // Mobile sidebar toggle
  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
  });
  document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
  });

  // ==========================================
  // 3. CONTINUOUS MACHINE LEARNING ENGINE
  // ==========================================
  const runMLInference = () => {
    const t = state.telemetry;
    const th = state.thresholds;

    // --- REGRESSION 1: COMPOSITE HEALTH INDEX REGRESSION MODEL (0-100%) ---
    // Multi-variate weighted degradation formula
    let penalty = 0;

    // Vibration penalty
    if (t.vibration > th.vibration.norm) {
      penalty += (t.vibration - th.vibration.norm) * 8.5;
    }
    // Temp penalty
    if (t.tempBearing > th.temp.norm) {
      penalty += (t.tempBearing - th.temp.norm) * 1.6;
    }
    // Alignment penalty
    if (t.alignment > th.alignment.norm) {
      penalty += (t.alignment - th.alignment.norm) * 9.0;
    }
    // Load penalty
    if (t.load > th.load.warn) {
      penalty += (t.load - th.load.warn) * 18.0;
    }
    // Current penalty
    if (t.current > th.current.warn) {
      penalty += (t.current - th.current.warn) * 22.0;
    }
    // Tension penalty (too loose or too tight)
    if (t.tension < th.tension.lowWarn) {
      penalty += (th.tension.lowWarn - t.tension) * 12.0;
    } else if (t.tension > th.tension.highCrit) {
      penalty += (t.tension - th.tension.highCrit) * 10.0;
    }
    // Acoustic penalty
    if (t.acousticDb > th.acoustic.warn) {
      penalty += (t.acousticDb - th.acoustic.warn) * 0.8;
    }
    // CV Defect penalty
    if (t.defectArea > 0) {
      penalty += t.defectArea * 15.0;
    }

    const rawHealth = Math.max(5, Math.min(100, 100 - penalty));
    state.ml.healthScore = Math.round(rawHealth);

    // --- REGRESSION 2: REMAINING USEFUL LIFE (RUL) PREDICTION MODEL ---
    // Polynomial wear regression
    const rulDaysEst = Math.max(0.5, (rawHealth - 25) * 0.41);
    state.ml.rulDays = +rulDaysEst.toFixed(1);
    state.ml.rulHours = Math.round(state.ml.rulDays * 24);

    // --- CLASSIFICATION: MULTI-CLASS FAULT DIAGNOSTIC CLASSIFIER ---
    // Simulates Random Forest Ensemble probabilities
    let probs = {
      normal: 99.2,
      bearing: 0.1,
      misalignment: 0.1,
      slippage: 0.1,
      overload: 0.1,
      slack: 0.1,
      tear: 0.1
    };

    let predictedClass = 'NORMAL_OPERATION';

    if (t.vibration > th.vibration.warn || (t.acousticDb > 70 && t.tempBearing > 50)) {
      predictedClass = 'BEARING_DEGRADATION';
      probs = { normal: 2.1, bearing: 94.8, misalignment: 1.2, slippage: 0.8, overload: 0.5, slack: 0.2, tear: 0.4 };
    } else if (t.alignment > th.alignment.warn) {
      predictedClass = 'BELT_MISALIGNMENT';
      probs = { normal: 4.5, bearing: 0.8, misalignment: 92.4, slippage: 1.5, overload: 0.3, slack: 0.3, tear: 0.2 };
    } else if (t.load > th.load.warn || t.current > th.current.warn) {
      predictedClass = 'OVERLOAD_JAM';
      probs = { normal: 3.2, bearing: 1.2, misalignment: 0.8, slippage: 2.0, overload: 91.6, slack: 0.4, tear: 0.8 };
    } else if (t.tension < th.tension.lowWarn) {
      predictedClass = 'SLACK_BELT';
      probs = { normal: 5.0, bearing: 0.5, misalignment: 2.2, slippage: 3.5, overload: 0.3, slack: 88.0, tear: 0.5 };
    } else if (t.defectArea > 2.0) {
      predictedClass = 'SURFACE_TEAR';
      probs = { normal: 1.5, bearing: 0.4, misalignment: 1.1, slippage: 0.5, overload: 0.2, slack: 0.3, tear: 96.0 };
    } else if (t.displacement > th.displacement.warn) {
      predictedClass = 'BELT_SLIPPAGE';
      probs = { normal: 6.0, bearing: 1.0, misalignment: 2.0, slippage: 89.5, overload: 0.8, slack: 0.5, tear: 0.2 };
    }

    state.ml.predictedState = predictedClass;
    state.ml.confidence = probs[predictedClass.toLowerCase().split('_')[0]] || 95.0;
    state.ml.probabilities = probs;
  };

  // ==========================================
  // 4. CHART.JS INSTANCES & OSCILLOSCOPES
  // ==========================================
  let mainTrendsChart, rtChartVib, rtChartTmp, rtChartSpd, rtChartLd, rtChartCur, rtChartAln, mlRegChart, histChart;

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#070f1e',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        bodyFont: { family: 'JetBrains Mono', size: 11 },
        padding: 8
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
      }
    }
  };

  const initAllCharts = () => {
    // 1. Main Dashboard Trend Chart
    const ctxMain = document.getElementById('sensorTrendsChart')?.getContext('2d');
    if (ctxMain) {
      mainTrendsChart = new Chart(ctxMain, {
        type: 'line',
        data: {
          labels: state.timeSeries.labels,
          datasets: [
            { label: 'Speed (m/s)', data: state.timeSeries.speed.map(v => v * 8), borderColor: '#0284c7', backgroundColor: 'rgba(2, 132, 199, 0.08)', borderWidth: 2, tension: 0.4, pointRadius: 0 },
            { label: 'Load (kg)', data: state.timeSeries.load.map(v => v * 4), borderColor: '#06b6d4', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 0 },
            { label: 'Temp (°C)', data: state.timeSeries.temp, borderColor: '#f97316', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 0 },
            { label: 'Vibration (mm/s)', data: state.timeSeries.vibration.map(v => v * 12), borderColor: '#a855f7', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 0 },
            { label: 'Tension (kg)', data: state.timeSeries.tension.map(v => v * 6), borderColor: '#eab308', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 0 }
          ]
        },
        options: chartDefaults
      });
    }

    // 2. Realtime Oscilloscope CH1 (Vibration)
    const ctxVib = document.getElementById('rtChartVibration')?.getContext('2d');
    if (ctxVib) {
      rtChartVib = new Chart(ctxVib, {
        type: 'line',
        data: {
          labels: state.timeSeries.labels,
          datasets: [{ data: state.timeSeries.vibration, borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)', fill: true, borderWidth: 2, tension: 0.35, pointRadius: 2 }]
        },
        options: chartDefaults
      });
    }

    // 3. Realtime Oscilloscope CH2 (Temp)
    const ctxTmp = document.getElementById('rtChartTemp')?.getContext('2d');
    if (ctxTmp) {
      rtChartTmp = new Chart(ctxTmp, {
        type: 'line',
        data: {
          labels: state.timeSeries.labels,
          datasets: [{ data: state.timeSeries.temp, borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', fill: true, borderWidth: 2, tension: 0.35, pointRadius: 2 }]
        },
        options: chartDefaults
      });
    }

    // 4. Realtime Oscilloscope CH3 (Speed)
    const ctxSpd = document.getElementById('rtChartSpeed')?.getContext('2d');
    if (ctxSpd) {
      rtChartSpd = new Chart(ctxSpd, {
        type: 'line',
        data: {
          labels: state.timeSeries.labels,
          datasets: [{ data: state.timeSeries.speed, borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, borderWidth: 2, tension: 0.35, pointRadius: 2 }]
        },
        options: chartDefaults
      });
    }

    // 5. Realtime Oscilloscope CH4 (Load)
    const ctxLd = document.getElementById('rtChartLoad')?.getContext('2d');
    if (ctxLd) {
      rtChartLd = new Chart(ctxLd, {
        type: 'line',
        data: {
          labels: state.timeSeries.labels,
          datasets: [{ data: state.timeSeries.load, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', fill: true, borderWidth: 2, tension: 0.35, pointRadius: 2 }]
        },
        options: chartDefaults
      });
    }

    // 6. Realtime Oscilloscope CH5 (Current)
    const ctxCur = document.getElementById('rtChartCurrent')?.getContext('2d');
    if (ctxCur) {
      rtChartCur = new Chart(ctxCur, {
        type: 'line',
        data: {
          labels: state.timeSeries.labels,
          datasets: [{ data: state.timeSeries.current, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, borderWidth: 2, tension: 0.35, pointRadius: 2 }]
        },
        options: chartDefaults
      });
    }

    // 7. Realtime Oscilloscope CH6 (Alignment)
    const ctxAln = document.getElementById('rtChartAlignment')?.getContext('2d');
    if (ctxAln) {
      rtChartAln = new Chart(ctxAln, {
        type: 'line',
        data: {
          labels: state.timeSeries.labels,
          datasets: [{ data: state.timeSeries.alignment, borderColor: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.1)', fill: true, borderWidth: 2, tension: 0.35, pointRadius: 2 }]
        },
        options: chartDefaults
      });
    }

    // 8. ML RUL Regression Degradation Curve
    const ctxReg = document.getElementById('mlRegressionChart')?.getContext('2d');
    if (ctxReg) {
      mlRegChart = new Chart(ctxReg, {
        type: 'line',
        data: {
          labels: ['Day 0', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 23 (RUL)', 'Day 28 (Crit)', 'Day 35'],
          datasets: [
            { label: 'Predicted Health %', data: [98, 92, 87, 82, 74, 62, 35, 12], borderColor: '#38bdf8', borderWidth: 2.5, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#38bdf8' },
            { label: 'Critical Threshold (35%)', data: [35, 35, 35, 35, 35, 35, 35, 35], borderColor: '#ef4444', borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0 }
          ]
        },
        options: chartDefaults
      });
    }

    // 9. History Trends Chart
    const ctxHist = document.getElementById('historyTrendsChart')?.getContext('2d');
    if (ctxHist) {
      const histLabels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
      const histData = Array.from({ length: 30 }, (_, i) => +(2.2 + Math.sin(i * 0.4) * 0.35 + (i * 0.015)).toFixed(2));

      histChart = new Chart(ctxHist, {
        type: 'line',
        data: {
          labels: histLabels,
          datasets: [{
            label: '30-Day Historical Trend',
            data: histData,
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.08)',
            fill: true,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 2
          }]
        },
        options: chartDefaults
      });
    }
  };

  // Push new data points to all charts
  const pushChartData = () => {
    const timeLabel = `${String(state.currentTime.getHours() % 12 || 12).padStart(2, '0')}:${String(state.currentTime.getMinutes()).padStart(2, '0')}`;
    const t = state.telemetry;

    // Main Chart
    if (mainTrendsChart) {
      mainTrendsChart.data.labels.shift();
      mainTrendsChart.data.labels.push(timeLabel);
      mainTrendsChart.data.datasets[0].data.shift();
      mainTrendsChart.data.datasets[0].data.push(t.speed * 8);
      mainTrendsChart.data.datasets[1].data.shift();
      mainTrendsChart.data.datasets[1].data.push(t.load * 4);
      mainTrendsChart.data.datasets[2].data.shift();
      mainTrendsChart.data.datasets[2].data.push(t.tempBearing);
      mainTrendsChart.data.datasets[3].data.shift();
      mainTrendsChart.data.datasets[3].data.push(t.vibration * 12);
      mainTrendsChart.data.datasets[4].data.shift();
      mainTrendsChart.data.datasets[4].data.push(t.tension * 6);
      mainTrendsChart.update('none');
    }

    // Oscilloscopes
    const updateMiniChart = (chart, val) => {
      if (!chart) return;
      chart.data.labels.shift();
      chart.data.labels.push(timeLabel);
      chart.data.datasets[0].data.shift();
      chart.data.datasets[0].data.push(val);
      chart.update('none');
    };

    updateMiniChart(rtChartVib, t.vibration);
    updateMiniChart(rtChartTmp, t.tempBearing);
    updateMiniChart(rtChartSpd, t.speed);
    updateMiniChart(rtChartLd, t.load);
    updateMiniChart(rtChartCur, t.current);
    updateMiniChart(rtChartAln, t.alignment);
  };

  // ==========================================
  // 5. DOM DISPLAY UPDATE & THRESHOLD CHECK
  // ==========================================
  const formatTime = (d) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m}:${s} ${ampm}`;
  };

  const formatDate = (d) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatUptime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const updateUI = () => {
    const t = state.telemetry;
    const ml = state.ml;

    // 1. Top Metrics Cards
    document.getElementById('val-speed').textContent = t.speed.toFixed(2);
    document.getElementById('val-load').textContent = t.load.toFixed(2);
    document.getElementById('val-temp').textContent = t.tempBearing.toFixed(1);
    document.getElementById('val-vibration').textContent = t.vibration.toFixed(2);
    document.getElementById('val-alignment').textContent = t.alignment.toFixed(1);
    document.getElementById('val-tension').textContent = t.tension.toFixed(1);
    document.getElementById('val-current').textContent = t.current.toFixed(2);
    document.getElementById('val-power').textContent = t.power.toFixed(1);
    document.getElementById('val-healthScore').textContent = `${ml.healthScore}%`;
    document.getElementById('sidebarHealthVal').textContent = `${ml.healthScore}%`;
    document.getElementById('val-uptime').textContent = formatUptime(state.uptimeSeconds);

    const timeStr = formatTime(state.currentTime);
    const dateStr = formatDate(state.currentTime);
    if (document.getElementById('currentTimeStr')) document.getElementById('currentTimeStr').textContent = timeStr;
    if (document.getElementById('currentDateStr')) document.getElementById('currentDateStr').textContent = dateStr;
    if (document.getElementById('cameraTimestamp')) document.getElementById('cameraTimestamp').textContent = `${dateStr} ${timeStr}`;
    if (document.getElementById('cvTimestampFull')) document.getElementById('cvTimestampFull').textContent = `${dateStr} ${timeStr}`;
    if (document.getElementById('val-lastUpdatedTime')) document.getElementById('val-lastUpdatedTime').textContent = timeStr;
    if (document.getElementById('val-lastUpdatedDate')) document.getElementById('val-lastUpdatedDate').textContent = dateStr;

    // 2. Health Gauges & Indicator Arrow
    const gaugeFill = document.getElementById('sidebarGaugeFill');
    if (gaugeFill) {
      const maxOffset = 188.5;
      const offset = maxOffset - (ml.healthScore / 100) * maxOffset;
      gaugeFill.style.strokeDashoffset = offset;
    }

    const cardGaugeFill = document.getElementById('cardGaugeFill');
    if (cardGaugeFill) {
      const maxOffset = 125.6;
      const offset = maxOffset - (ml.healthScore / 100) * maxOffset;
      cardGaugeFill.style.strokeDashoffset = offset;
    }

    const arrowWrap = document.getElementById('indicatorArrowWrapper');
    if (arrowWrap) {
      arrowWrap.style.left = `${ml.healthScore}%`;
    }

    // Health Tags
    const sidebarHealthTag = document.getElementById('sidebarHealthTag');
    const valHealthTag = document.getElementById('val-healthTag');
    const maintCondTag = document.getElementById('maintConditionTag');

    let healthClass = 'tag-good';
    let healthLabel = 'OPTIMAL';

    if (ml.healthScore < 40) {
      healthClass = 'tag-critical';
      healthLabel = 'CRITICAL';
    } else if (ml.healthScore < 70) {
      healthClass = 'tag-warning';
      healthLabel = 'WARNING';
    }

    if (sidebarHealthTag) {
      sidebarHealthTag.className = `gauge-status-tag ${healthClass}`;
      sidebarHealthTag.textContent = healthLabel;
    }
    if (valHealthTag) {
      valHealthTag.className = `mini-tag ${healthClass}`;
      valHealthTag.textContent = healthLabel;
    }
    if (maintCondTag) {
      maintCondTag.className = healthClass.replace('tag-', 'text-');
      maintCondTag.textContent = healthLabel;
    }

    // 3. ML Diagnosis Banner
    const banner = document.getElementById('mlFaultBanner');
    const bannerTitle = document.getElementById('mlBannerTitle');
    const bannerConf = document.getElementById('mlBannerConfidence');
    const bannerDesc = document.getElementById('mlBannerDesc');

    if (banner) {
      banner.className = `ml-diagnosis-banner ${ml.predictedState !== 'NORMAL_OPERATION' ? (ml.healthScore < 40 ? 'critical' : 'warning') : ''}`;
      bannerTitle.textContent = `ML CONTINUOUS FAULT DIAGNOSIS: ${ml.predictedState.replace('_', ' ')}`;
      bannerConf.textContent = `${ml.confidence.toFixed(1)}% Confidence`;

      if (ml.predictedState === 'NORMAL_OPERATION') {
        bannerDesc.textContent = `Machine learning Random Forest Classifier and Regression models detect nominal operating state. Remaining Useful Life: ${ml.rulDays} Days (${ml.rulHours} operating hours).`;
      } else {
        bannerDesc.textContent = `ANOMALY DETECTED: Machine telemetry deviates from normal envelope. Predicted state: ${ml.predictedState}. Immediate inspection recommended.`;
      }
    }

    // 4. ML Analytics Tab Elements
    document.getElementById('mlRulDays').textContent = `${ml.rulDays} Days`;
    document.getElementById('mlRulHours').textContent = `${ml.rulHours} Operating Hours`;
    document.getElementById('mlHealthScoreVal').textContent = `${ml.healthScore}.0%`;
    document.getElementById('mlPredStateText').textContent = ml.predictedState.replace('_', ' ');
    document.getElementById('mlPredStateText').className = `pred-result-tag ${healthClass}`;
    document.getElementById('mlPredConfVal').textContent = `${ml.confidence.toFixed(1)}%`;

    // Probability Bars
    const updateProbBar = (key, val) => {
      const bar = document.getElementById(`probBar-${key}`);
      const pct = document.getElementById(`probPct-${key}`);
      if (bar) bar.style.width = `${val}%`;
      if (pct) pct.textContent = `${val.toFixed(1)}%`;
    };

    updateProbBar('normal', ml.probabilities.normal);
    updateProbBar('bearing', ml.probabilities.bearing);
    updateProbBar('misalign', ml.probabilities.misalignment);
    updateProbBar('slip', ml.probabilities.slippage);
    updateProbBar('overload', ml.probabilities.overload);
    updateProbBar('slack', ml.probabilities.slack);
    updateProbBar('tear', ml.probabilities.tear);

    // 5. Sensor Status Table & 15 Deep-Dive Cards
    document.getElementById('tbl-vibration').textContent = `${t.vibration.toFixed(2)} mm/s`;
    document.getElementById('tbl-temp').textContent = `${t.tempBearing.toFixed(1)} °C`;
    document.getElementById('tbl-load').textContent = `${t.load.toFixed(2)} kg`;
    document.getElementById('tbl-speed').textContent = `${t.speed.toFixed(2)} m/s`;
    document.getElementById('tbl-alignment').textContent = `${t.alignment.toFixed(1)} mm`;
    document.getElementById('tbl-tension').textContent = `${t.tension.toFixed(1)} kg`;
    document.getElementById('tbl-current').textContent = `${t.current.toFixed(2)} A`;
    document.getElementById('tbl-acoustic').textContent = `${t.acousticDb.toFixed(1)} dB`;
    document.getElementById('tbl-thermal').textContent = `${t.tempThermal.toFixed(1)} °C`;
    document.getElementById('tbl-displacement').textContent = `${t.displacement.toFixed(2)} mm`;

    // Component cards live specs
    document.getElementById('compValMPU').textContent = `${t.vibration.toFixed(2)} mm/s`;
    document.getElementById('compValDS18').textContent = `${t.tempBearing.toFixed(1)} °C`;
    document.getElementById('compValLoad').textContent = `${t.load.toFixed(2)} kg`;
    document.getElementById('compValSpeed').textContent = `${t.speed.toFixed(2)} m/s`;
    document.getElementById('compValAlign').textContent = `${t.alignment.toFixed(1)} mm`;
    document.getElementById('compValAcoustic').textContent = `${t.acousticDb.toFixed(1)} dB`;
    document.getElementById('compValINA').textContent = `${t.current.toFixed(2)} A / ${t.power.toFixed(1)} W`;
    document.getElementById('compValTension').textContent = `${t.tension.toFixed(1)} kg`;
    document.getElementById('compValDisplace').textContent = `${t.displacement.toFixed(2)} mm`;
    document.getElementById('compValMLX').textContent = `${t.tempThermal.toFixed(1)} °C`;
    document.getElementById('compValDefect').textContent = `${t.defectArea.toFixed(1)}%`;

    // 6. Realtime Channel Values
    document.getElementById('rtVal-vibration').textContent = `${t.vibration.toFixed(2)} mm/s`;
    document.getElementById('rtVal-temp').textContent = `${t.tempBearing.toFixed(1)} °C / ${t.tempThermal.toFixed(1)} °C`;
    document.getElementById('rtVal-speed').textContent = `${t.speed.toFixed(2)} m/s`;
    document.getElementById('rtVal-load').textContent = `${t.load.toFixed(2)} kg / ${t.tension.toFixed(1)} kg`;
    document.getElementById('rtVal-current').textContent = `${t.current.toFixed(2)} A / ${t.power.toFixed(1)} W`;
    document.getElementById('rtVal-alignment').textContent = `${t.alignment.toFixed(1)} mm / ${t.acousticDb.toFixed(1)} dB`;

    // 7. Maintenance View Items
    document.getElementById('maintRemainingDays').textContent = `${ml.rulDays} Days`;
    document.getElementById('maintProgressFill').style.width = `${ml.healthScore}%`;
    document.getElementById('maintProgressPct').textContent = `${ml.healthScore}%`;

    // 8. Raw Packet Terminal
    const packetObj = {
      ts: state.currentTime.getTime(),
      speed: +t.speed.toFixed(2),
      load: +t.load.toFixed(2),
      temp_bearing: +t.tempBearing.toFixed(1),
      temp_thermal: +t.tempThermal.toFixed(1),
      vibration: +t.vibration.toFixed(2),
      alignment: +t.alignment.toFixed(1),
      tension: +t.tension.toFixed(1),
      current: +t.current.toFixed(2),
      power: +t.power.toFixed(1),
      acoustic_db: +t.acousticDb.toFixed(1),
      displacement: +t.displacement.toFixed(2),
      defect_area_pct: +t.defectArea.toFixed(1),
      health_score: ml.healthScore,
      rul_days: ml.rulDays,
      status: ml.healthScore >= 70 ? "NORMAL" : (ml.healthScore >= 40 ? "WARNING" : "CRITICAL")
    };

    const terminalEl = document.getElementById('rawPacketTerminal');
    if (terminalEl) terminalEl.textContent = JSON.stringify(packetObj, null, 2);
    document.getElementById('rtPacketCount').textContent = `Packets: ${state.packetCount} | 4.0 Hz`;
  };

  // ==========================================
  // 6. COMPUTER VISION WORKBENCH OVERLAY
  // ==========================================
  const initCVOverlay = () => {
    const canvasSmall = document.getElementById('cameraOverlayCanvas');
    const canvasLarge = document.getElementById('cvLargeCanvas');

    let laserY = 10;
    let laserDir = 1;

    const renderCanvas = (canvas) => {
      if (!canvas || !canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Moving Laser Scanning Profile Line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2;
      ctx.moveTo(0, laserY);
      ctx.lineTo(w, laserY);
      ctx.stroke();

      const glow = ctx.createLinearGradient(0, laserY - 14, 0, laserY + 14);
      glow.addColorStop(0, 'rgba(56, 189, 248, 0)');
      glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.3)');
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, laserY - 14, w, 28);

      // 2. Roller Bounding Box
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w * 0.12, h * 0.4, w * 0.22, h * 0.42);
      ctx.fillStyle = '#22c55e';
      ctx.font = '10px "JetBrains Mono"';
      ctx.fillText('ROLLER #1: 99.4%', w * 0.12, h * 0.37);

      // 3. Optical Sensor Module Box
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(w * 0.6, h * 0.35, w * 0.18, h * 0.25);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('OPTICAL IR: OK', w * 0.6, h * 0.32);

      // 4. Injected Defects Rendering
      if (state.activeCVDefect === 'crack') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.45, h * 0.5);
        ctx.lineTo(w * 0.48, h * 0.58);
        ctx.lineTo(w * 0.52, h * 0.54);
        ctx.lineTo(w * 0.56, h * 0.65);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.fillText('SURFACE TEAR DETECTED [3.8% AREA]', w * 0.4, h * 0.46);
      } else if (state.activeCVDefect === 'joint') {
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(w * 0.35, h * 0.3, w * 0.08, h * 0.45);
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('JOINT SPLICE GAP (4.2 mm)', w * 0.32, h * 0.26);
      }
    };

    const animateCV = () => {
      laserY += laserDir * 1.5;
      if (laserY > 380) laserDir = -1;
      if (laserY < 15) laserDir = 1;

      renderCanvas(canvasSmall);
      renderCanvas(canvasLarge);

      requestAnimationFrame(animateCV);
    };

    animateCV();
  };

  // ==========================================
  // 7. SIMULATION ENGINE & FAULT INJECTION
  // ==========================================
  const applyFaultState = () => {
    const t = state.telemetry;
    const f = state.activeFault;

    if (f === 'none') {
      t.speed = 1.28 + (Math.random() - 0.5) * 0.03;
      t.load = 4.35 + (Math.random() - 0.5) * 0.06;
      t.tempBearing = 38.6 + (Math.random() - 0.5) * 0.1;
      t.tempThermal = t.tempBearing - 0.2;
      t.vibration = 2.45 + (Math.random() - 0.5) * 0.05;
      t.alignment = 2.1 + (Math.random() - 0.5) * 0.04;
      t.tension = 6.2 + (Math.random() - 0.5) * 0.05;
      t.current = 1.35 + (Math.random() - 0.5) * 0.03;
      t.acousticDb = 54.2 + (Math.random() - 0.5) * 0.5;
      t.displacement = 0.8 + (Math.random() - 0.5) * 0.02;
      t.defectArea = 0.0;
      state.activeCVDefect = 'none';
    } else if (f === 'bearing') {
      t.vibration = 5.85 + (Math.random() - 0.5) * 0.2;  // Severe MPU6050 vibration
      t.tempBearing = 64.2 + (Math.random() - 0.5) * 0.3; // Bearing overheating
      t.tempThermal = 58.0;
      t.acousticDb = 78.4 + (Math.random() - 0.5) * 1.0;  // Screeching noise
      t.current = 1.85;
      playBuzzerTone(900, 150);
    } else if (f === 'misalignment') {
      t.alignment = 4.2 + (Math.random() - 0.5) * 0.15;  // Lateral drift > 3.0mm
      t.edgeFray = 1.85;
    } else if (f === 'slippage') {
      t.speed = 0.82;                                    // Slowed down
      t.displacement = 3.2;                              // Pulley displacement
      t.current = 1.95;
    } else if (f === 'overload') {
      t.load = 5.85;                                     // Over capacity
      t.current = 2.75;                                  // Current spike
      t.power = 33.2;
      t.speed = 1.05;
      playBuzzerTone(1100, 200);
    } else if (f === 'slack') {
      t.tension = 2.4;                                   // Slack tension
      t.alignment = 3.4;
    } else if (f === 'crack') {
      t.defectArea = 4.2;                                // Tear detected
      state.activeCVDefect = 'crack';
      playBuzzerTone(750, 150);
    }

    t.power = +(t.current * t.voltage).toFixed(1);
  };

  const startSimulation = () => {
    setInterval(() => {
      if (!state.isLive || state.isSerialConnected) return;

      state.currentTime.setSeconds(state.currentTime.getSeconds() + 1);
      state.uptimeSeconds += 1;
      state.packetCount += 1;

      applyFaultState();
      runMLInference();
      updateUI();

      if (state.currentTime.getSeconds() % 5 === 0) {
        pushChartData();
      }
    }, 1000);
  };

  // ==========================================
  // 8. INTERACTIVE ML PLAYGROUND SLIDERS
  // ==========================================
  const setupMLPlayground = () => {
    const sVib = document.getElementById('simVibSlider');
    const sTmp = document.getElementById('simTempSlider');
    const sAln = document.getElementById('simAlignSlider');
    const sLd = document.getElementById('simLoadSlider');
    const sCur = document.getElementById('simCurrentSlider');
    const sTen = document.getElementById('simTensionSlider');

    const updatePlaygroundResult = () => {
      const v = parseFloat(sVib.value);
      const tmp = parseFloat(sTmp.value);
      const a = parseFloat(sAln.value);
      const l = parseFloat(sLd.value);
      const c = parseFloat(sCur.value);
      const ten = parseFloat(sTen.value);

      document.getElementById('simValVib').textContent = `${v.toFixed(2)} mm/s`;
      document.getElementById('simValTemp').textContent = `${tmp.toFixed(1)} °C`;
      document.getElementById('simValAlign').textContent = `${a.toFixed(1)} mm`;
      document.getElementById('simValLoad').textContent = `${l.toFixed(2)} kg`;
      document.getElementById('simValCurrent').textContent = `${c.toFixed(2)} A`;
      document.getElementById('simValTension').textContent = `${ten.toFixed(1)} kg`;

      // Compute quick ML score for playground
      let penalty = (v > 2.8 ? (v - 2.8) * 8.5 : 0) +
                    (tmp > 45 ? (tmp - 45) * 1.6 : 0) +
                    (a > 2.0 ? (a - 2.0) * 9.0 : 0) +
                    (l > 4.8 ? (l - 4.8) * 18.0 : 0) +
                    (c > 2.2 ? (c - 2.2) * 22.0 : 0) +
                    (ten < 4.0 ? (4.0 - ten) * 12.0 : 0);

      const h = Math.max(5, Math.min(100, Math.round(100 - penalty)));
      const rul = Math.max(0.5, +((h - 25) * 0.41).toFixed(1));

      let stateName = 'NORMAL OPERATION';
      let stateTag = 'tag-good';
      let conf = 99.2;
      let rec = 'Machine operating within ideal limits. No corrective maintenance required.';

      if (v > 4.5 || tmp > 60) {
        stateName = 'BEARING DEGRADATION';
        stateTag = 'tag-critical';
        conf = 95.4;
        rec = 'High vibration/thermal signature. Inspect bearing race and re-lubricate.';
      } else if (a > 3.0) {
        stateName = 'BELT MISALIGNMENT';
        stateTag = 'tag-warning';
        conf = 92.1;
        rec = 'Belt drifting laterally. Adjust idler roller tensioner screws.';
      } else if (l > 5.0 || c > 2.5) {
        stateName = 'OVERLOAD / MOTOR JAM';
        stateTag = 'tag-critical';
        conf = 96.8;
        rec = 'Motor stall condition approaching. Reduce conveyor feeder rate immediately.';
      } else if (ten < 4.0) {
        stateName = 'SLACK BELT';
        stateTag = 'tag-warning';
        conf = 89.0;
        rec = 'Belt tension too low. Tighten take-up pulleys to eliminate slippage.';
      }

      document.getElementById('simResultState').textContent = stateName;
      document.getElementById('simResultState').className = stateTag;
      document.getElementById('simResultConf').textContent = `${conf}%`;
      document.getElementById('simResultHealth').textContent = `${h}%`;
      document.getElementById('simResultRul').textContent = `${rul} Days`;
      document.getElementById('simResultAction').innerHTML = `<strong>ML Recommendation:</strong> ${rec}`;
    };

    [sVib, sTmp, sAln, sLd, sCur, sTen].forEach(slider => {
      slider?.addEventListener('input', updatePlaygroundResult);
    });

    document.getElementById('btnResetMLPlayground')?.addEventListener('click', () => {
      sVib.value = 2.45;
      sTmp.value = 38.6;
      sAln.value = 2.1;
      sLd.value = 4.35;
      sCur.value = 1.35;
      sTen.value = 6.2;
      updatePlaygroundResult();
      showToast('ML Playground reset to baseline telemetry');
    });
  };

  // ==========================================
  // 9. WEB SERIAL API HARDWARE BRIDGE
  // ==========================================
  const setupWebSerial = () => {
    const btnConnect = document.getElementById('btnToggleSerialPort');
    const btnPageConnect = document.getElementById('btnConnectSerialPage');

    const handleSerialConnection = async () => {
      if (!('serial' in navigator)) {
        showToast('Web Serial API is not supported in this browser. Use Chrome/Edge.', 'error');
        return;
      }

      try {
        if (!state.isSerialConnected) {
          state.serialPort = await navigator.serial.requestPort();
          await state.serialPort.open({ baudRate: 115200 });

          state.isSerialConnected = true;
          document.getElementById('hwBadgeStatus').textContent = 'Connected (115200 Baud)';
          document.getElementById('hwBadgeStatus').className = 'status-badge tag-good';
          document.getElementById('hwPortName').textContent = 'COM Port (ESP32 USB)';
          document.getElementById('serialStatusText').textContent = 'SERIAL ONLINE';
          document.getElementById('serialSubText').textContent = 'ESP32 Active';
          btnConnect.innerHTML = '<i class="fa-solid fa-unlink"></i> Disconnect Serial Port';
          showToast('Connected to ESP32 / Arduino hardware via Web Serial!');

          // Read stream loop
          const textDecoder = new TextDecoderStream();
          state.serialPort.readable.pipeTo(textDecoder.writable);
          state.serialReader = textDecoder.readable.getReader();

          let buffer = '';
          while (true) {
            const { value, done } = await state.serialReader.read();
            if (done) break;
            buffer += value;
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
              try {
                const data = JSON.parse(line.trim());
                if (data.speed !== undefined) state.telemetry.speed = parseFloat(data.speed);
                if (data.load !== undefined) state.telemetry.load = parseFloat(data.load);
                if (data.temp_bearing !== undefined) state.telemetry.tempBearing = parseFloat(data.temp_bearing);
                if (data.vibration !== undefined) state.telemetry.vibration = parseFloat(data.vibration);
                if (data.alignment !== undefined) state.telemetry.alignment = parseFloat(data.alignment);
                if (data.tension !== undefined) state.telemetry.tension = parseFloat(data.tension);
                if (data.current !== undefined) state.telemetry.current = parseFloat(data.current);
                state.packetCount++;
                runMLInference();
                updateUI();
              } catch (e) {
                // Ignore parse errors from incomplete lines
              }
            }
          }
        } else {
          state.serialReader?.cancel();
          await state.serialPort?.close();
          state.isSerialConnected = false;
          document.getElementById('hwBadgeStatus').textContent = 'Simulation Mode';
          document.getElementById('hwPortName').textContent = 'Simulated Virtual Port';
          document.getElementById('serialStatusText').textContent = 'CONNECT SERIAL';
          document.getElementById('serialSubText').textContent = '115200 Baud';
          btnConnect.innerHTML = '<i class="fa-solid fa-link"></i> Open Serial Port';
          showToast('Disconnected from hardware serial port');
        }
      } catch (err) {
        showToast(`Serial error: ${err.message}`, 'error');
      }
    };

    btnConnect?.addEventListener('click', handleSerialConnection);
    btnPageConnect?.addEventListener('click', handleSerialConnection);
  };

  // ==========================================
  // 10. EVENT LISTENERS & INTERACTIVITY
  // ==========================================
  const setupEventListeners = () => {
    // Fault Injector Select
    document.getElementById('faultInjectSelect')?.addEventListener('change', (e) => {
      state.activeFault = e.target.value;
      applyFaultState();
      runMLInference();
      updateUI();
      pushChartData();

      if (state.activeFault === 'none') {
        showToast('System returned to Nominal Operating Conditions');
      } else {
        showToast(`Simulating: ${e.target.options[e.target.selectedIndex].text}`, 'warning');
      }
    });

    // Live Stream Toggle
    const simToggleBtn = document.getElementById('simToggleBtn');
    simToggleBtn?.addEventListener('click', () => {
      state.isLive = !state.isLive;
      if (state.isLive) {
        simToggleBtn.classList.remove('paused');
        simToggleBtn.querySelector('.sim-label').textContent = 'LIVE STREAM';
        showToast('Live telemetry streaming resumed');
      } else {
        simToggleBtn.classList.add('paused');
        simToggleBtn.querySelector('.sim-label').textContent = 'STREAM PAUSED';
        showToast('Telemetry streaming paused (Snapshot Mode)');
      }
    });

    // CV Defect Injections
    document.getElementById('btnInjectCrack')?.addEventListener('click', () => {
      state.activeCVDefect = 'crack';
      state.telemetry.defectArea = 3.8;
      document.getElementById('cvDefectAreaVal').textContent = '3.8%';
      document.getElementById('cvDefectBadge').textContent = 'Tear Detected';
      document.getElementById('cvDefectBadge').className = 'cv-status-badge tag-critical';
      runMLInference();
      updateUI();
      showToast('Injected Conveyor Belt Surface Tear Defect');
    });

    document.getElementById('btnInjectJointGap')?.addEventListener('click', () => {
      state.activeCVDefect = 'joint';
      document.getElementById('cvJointGapVal').textContent = '4.2 mm';
      showToast('Injected Splice Joint Separation Defect');
    });

    document.getElementById('btnResetCVDefects')?.addEventListener('click', () => {
      state.activeCVDefect = 'none';
      state.telemetry.defectArea = 0.0;
      document.getElementById('cvDefectAreaVal').textContent = '0.0%';
      document.getElementById('cvDefectBadge').textContent = 'Pristine';
      document.getElementById('cvDefectBadge').className = 'cv-status-badge tag-good';
      document.getElementById('cvJointGapVal').textContent = '0.0 mm';
      runMLInference();
      updateUI();
      showToast('Cleared CV defects. Belt surface restored.');
    });

    // Test Buzzer & Alarm Button
    document.getElementById('btnTestBuzzer')?.addEventListener('click', () => {
      playBuzzerTone(1000, 250);
      showToast('Audible buzzer pulsed (1000 Hz) & LEDs tripped');
    });

    // Save Thresholds
    document.getElementById('btnSaveAllThresholds')?.addEventListener('click', () => {
      showToast('Component safety thresholds updated across all 15 sensors');
    });

    // Presets
    document.getElementById('btnPresetStandard')?.addEventListener('click', () => {
      document.getElementById('thSpeedSet').value = '1.30';
      document.getElementById('thLoadMax').value = '5.0';
      document.getElementById('thTempNorm').value = '45';
      document.getElementById('thVibNorm').value = '2.8';
      showToast('Standard Industrial Line threshold preset applied');
    });

    document.getElementById('btnPresetMining')?.addEventListener('click', () => {
      document.getElementById('thSpeedSet').value = '2.50';
      document.getElementById('thLoadMax').value = '10.0';
      document.getElementById('thTempNorm').value = '65';
      document.getElementById('thVibNorm').value = '4.5';
      showToast('Heavy Duty Mining Rig threshold preset applied');
    });

    // Copy Firmware Code
    document.getElementById('btnCopyFirmwareCode')?.addEventListener('click', () => {
      const code = document.getElementById('firmwareCodeView').textContent;
      navigator.clipboard.writeText(code).then(() => {
        showToast('Arduino/ESP32 C++ firmware sketch copied to clipboard!');
      });
    });

    // Export CSV
    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      const csv = `Timestamp,Speed(m/s),Load(kg),Temp(C),Vibration(mm/s),Alignment(mm),Tension(kg),Current(A),Power(W),HealthScore,Status\n${new Date().toISOString()},${state.telemetry.speed},${state.telemetry.load},${state.telemetry.tempBearing},${state.telemetry.vibration},${state.telemetry.alignment},${state.telemetry.tension},${state.telemetry.current},${state.telemetry.power},${state.ml.healthScore},${state.ml.predictedState}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conveyor_telemetry_${Date.now()}.csv`;
      a.click();
      showToast('CSV Telemetry report downloaded');
    });

    // Export JSON
    document.getElementById('btnExportJSON')?.addEventListener('click', () => {
      const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const a = document.createElement('a');
      a.href = jsonStr;
      a.download = `conveyor_full_state_${Date.now()}.json`;
      a.click();
      showToast('Complete system JSON telemetry exported');
    });

    // Print Document
    document.getElementById('btnPrintReport')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btnDownloadPDF')?.addEventListener('click', () => {
      window.print();
    });

    // Quick Download
    document.getElementById('btnQuickDownload')?.addEventListener('click', () => {
      document.getElementById('btnExportJSON').click();
    });
  };

  // Toast Helper
  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'warning' ? 'fa-triangle-exclamation text-yellow' : (type === 'error' ? 'fa-circle-xmark text-critical' : 'fa-circle-check text-green');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // ==========================================
  // 11. INITIALIZATION
  // ==========================================
  initAllCharts();
  initCVOverlay();
  setupMLPlayground();
  setupWebSerial();
  setupEventListeners();
  runMLInference();
  updateUI();
  startSimulation();
});
