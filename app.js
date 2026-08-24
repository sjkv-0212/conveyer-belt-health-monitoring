/**
 * INTELLIGENT CONVEYOR BELT MONITORING SYSTEM
 * Real-time Monitoring & Predictive Maintenance Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // State Management
  const state = {
    isLive: true,
    speed: 1.28,
    speedSetPoint: 1.30,
    load: 4.35,
    temp: 38.6,
    vibration: 2.45,
    alignment: 2.1,
    tension: 6.2,
    current: 1.35,
    power: 24.8,
    healthScore: 82,
    predictedDays: 23,
    remainingPct: 76,
    uptimeSeconds: 12 * 3600 + 45 * 60, // 12h 45m
    currentTime: new Date(2025, 4, 24, 10, 24, 35),
    timeSeriesLabels: ['10:14', '10:16', '10:18', '10:20', '10:22', '10:24'],
    datasets: {
      speed: [1.25, 1.29, 1.27, 1.31, 1.28, 1.28],
      load: [4.2, 4.5, 4.3, 4.4, 4.35, 4.35],
      temp: [37.8, 38.1, 38.4, 38.2, 38.5, 38.6],
      vibration: [2.3, 2.6, 2.4, 2.55, 2.4, 2.45],
      tension: [6.1, 6.3, 6.0, 6.4, 6.2, 6.2]
    }
  };

  // DOM References
  const dom = {
    valSpeed: document.getElementById('val-speed'),
    valLoad: document.getElementById('val-load'),
    valTemp: document.getElementById('val-temp'),
    valVibration: document.getElementById('val-vibration'),
    valAlignment: document.getElementById('val-alignment'),
    valTension: document.getElementById('val-tension'),
    valCurrent: document.getElementById('val-current'),
    valPower: document.getElementById('val-power'),
    valHealthScore: document.getElementById('val-healthScore'),
    valUptime: document.getElementById('val-uptime'),
    valLastUpdated: document.getElementById('val-lastUpdated'),
    currentTimeStr: document.getElementById('currentTimeStr'),
    currentDateStr: document.getElementById('currentDateStr'),
    cameraTimestamp: document.getElementById('cameraTimestamp'),
    simToggleBtn: document.getElementById('simToggleBtn'),
    indicatorArrowWrapper: document.getElementById('indicatorArrowWrapper'),
    sidebarGaugeFill: document.getElementById('sidebarGaugeFill'),
    cardGaugeFill: document.getElementById('cardGaugeFill'),
    sidebarHealthVal: document.getElementById('sidebarHealthVal'),
    tblVibration: document.getElementById('tbl-vibration'),
    tblTemp: document.getElementById('tbl-temp'),
    tblLoad: document.getElementById('tbl-load'),
    tblSpeed: document.getElementById('tbl-speed'),
    tblAlignment: document.getElementById('tbl-alignment'),
    tblTension: document.getElementById('tbl-tension'),
    tblCurrent: document.getElementById('tbl-current'),
    tblThermal: document.getElementById('tbl-thermal'),
    cameraCanvas: document.getElementById('cameraOverlayCanvas'),
    toastContainer: document.getElementById('toastContainer')
  };

  // Setup Chart.js
  let sensorChart;
  const initChart = () => {
    const ctx = document.getElementById('sensorTrendsChart').getContext('2d');

    // Gradient helper
    const createGrad = (color1, color2) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 180);
      grad.addColorStop(0, color1);
      grad.addColorStop(1, color2);
      return grad;
    };

    sensorChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: state.timeSeriesLabels,
        datasets: [
          {
            label: 'Speed (m/s)',
            data: state.datasets.speed.map(v => v * 7.5), // scaled for visual alignment
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            borderWidth: 2.2,
            tension: 0.42,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Load (kg)',
            data: [18, 22, 19, 21, 24, 20],
            borderColor: '#06b6d4',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.42,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Temp (°C)',
            data: [38, 42, 36, 44, 40, 43],
            borderColor: '#f97316',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Vibration (mm/s)',
            data: [28, 35, 27, 31, 29, 33],
            borderColor: '#a855f7',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Tension (kg)',
            data: [47, 50, 46, 49, 52, 48],
            borderColor: '#eab308',
            backgroundColor: 'transparent',
            borderWidth: 2.2,
            tension: 0.45,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0b162a',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(56, 189, 248, 0.25)',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            displayColors: true
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 }
            }
          },
          y: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 60,
            ticks: {
              stepSize: 15,
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
              drawBorder: false
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 10,
            ticks: {
              stepSize: 2.5,
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 }
            },
            grid: {
              drawOnChartArea: false,
              drawBorder: false
            }
          }
        }
      }
    });

    // Custom legend interactive toggling
    document.querySelectorAll('.legend-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const datasetIndex = parseInt(pill.getAttribute('data-dataset'), 10);
        const meta = sensorChart.getDatasetMeta(datasetIndex);
        meta.hidden = meta.hidden === null ? !sensorChart.data.datasets[datasetIndex].hidden : null;
        pill.style.opacity = meta.hidden ? '0.35' : '1';
        sensorChart.update();
      });
    });
  };

  // Helper: Format Time string
  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes}:${seconds} ${ampm}`;
  };

  const formatDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatUptime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Camera Overlay Computer Vision Inspection Simulation
  const initCameraOverlay = () => {
    const canvas = dom.cameraCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let scanLineY = 10;
    let scanDirection = 1;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const renderCV = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // 1. Moving Laser Scanning Line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(0, scanLineY);
      ctx.lineTo(w, scanLineY);
      ctx.stroke();

      // Scan glow gradient
      const glowGrad = ctx.createLinearGradient(0, scanLineY - 12, 0, scanLineY + 12);
      glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      glowGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
      glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, scanLineY - 12, w, 24);

      scanLineY += scanDirection * 1.2;
      if (scanLineY > h - 10) scanDirection = -1;
      if (scanLineY < 10) scanDirection = 1;

      // 2. AI Bounding Boxes on Conveyor Features
      // Roller 1 Box
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w * 0.1, h * 0.45, w * 0.22, h * 0.38);
      ctx.fillStyle = '#22c55e';
      ctx.font = '9px "JetBrains Mono"';
      ctx.fillText('ROLLER #1: 99.4%', w * 0.1, h * 0.42);

      // Belt Center Tracking
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.65);
      ctx.lineTo(w * 0.85, h * 0.32);
      ctx.stroke();
      ctx.setLineDash([]);

      // Sensor Module Target
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(w * 0.58, h * 0.38, w * 0.16, h * 0.22);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('OPTICAL IR: OK', w * 0.58, h * 0.35);

      requestAnimationFrame(renderCV);
    };

    renderCV();
  };

  // Update DOM Metric Displays
  const updateUI = () => {
    dom.valSpeed.textContent = state.speed.toFixed(2);
    dom.valLoad.textContent = state.load.toFixed(2);
    dom.valTemp.textContent = state.temp.toFixed(1);
    dom.valVibration.textContent = state.vibration.toFixed(2);
    dom.valAlignment.textContent = state.alignment.toFixed(1);
    dom.valTension.textContent = state.tension.toFixed(1);
    dom.valCurrent.textContent = state.current.toFixed(2);
    dom.valPower.textContent = state.power.toFixed(1);
    dom.valHealthScore.textContent = `${state.healthScore}%`;
    dom.sidebarHealthVal.textContent = `${state.healthScore}%`;
    dom.valUptime.textContent = formatUptime(state.uptimeSeconds);

    const timeStr = formatTime(state.currentTime);
    const dateStr = formatDate(state.currentTime);

    dom.valLastUpdated.textContent = timeStr;
    dom.currentTimeStr.textContent = timeStr;
    dom.currentDateStr.textContent = dateStr;
    dom.cameraTimestamp.textContent = `${dateStr} ${timeStr}`;

    // Table elements
    dom.tblVibration.textContent = `${state.vibration.toFixed(2)} mm/s`;
    dom.tblTemp.textContent = `${state.temp.toFixed(1)} °C`;
    dom.tblLoad.textContent = `${state.load.toFixed(2)} kg`;
    dom.tblSpeed.textContent = `${state.speed.toFixed(2)} m/s`;
    dom.tblAlignment.textContent = `${state.alignment.toFixed(1)} mm`;
    dom.tblTension.textContent = `${state.tension.toFixed(1)} kg`;
    dom.tblCurrent.textContent = `${state.current.toFixed(2)} A`;
    dom.tblThermal.textContent = `${state.temp.toFixed(1)} °C`;

    // Arrow pointer on belt health
    if (dom.indicatorArrowWrapper) {
      dom.indicatorArrowWrapper.style.left = `${state.healthScore}%`;
    }
  };

  // Real-time Simulation Engine Loop
  let simInterval;
  const startSimulation = () => {
    simInterval = setInterval(() => {
      if (!state.isLive) return;

      // Advance Time
      state.currentTime.setSeconds(state.currentTime.getSeconds() + 1);
      state.uptimeSeconds += 1;

      // Small realistic fluctuations
      const jitter = (Math.random() - 0.5) * 0.02;
      state.speed = Math.max(1.1, Math.min(1.4, state.speed + jitter));
      state.load = Math.max(3.8, Math.min(5.2, state.load + (Math.random() - 0.5) * 0.04));
      state.temp = Math.max(36.0, Math.min(42.0, state.temp + (Math.random() - 0.49) * 0.05));
      state.vibration = Math.max(2.1, Math.min(2.8, state.vibration + (Math.random() - 0.5) * 0.03));
      state.alignment = Math.max(1.8, Math.min(2.4, state.alignment + (Math.random() - 0.5) * 0.02));
      state.tension = Math.max(5.8, Math.min(6.6, state.tension + (Math.random() - 0.5) * 0.03));
      state.current = Math.max(1.2, Math.min(1.5, (state.speed * 0.9 + state.load * 0.05).toFixed(2)));
      state.power = +(state.current * 18.37).toFixed(1);

      // Periodically push chart points
      if (state.currentTime.getSeconds() % 10 === 0 && sensorChart) {
        const timeLabel = `${String(state.currentTime.getHours() % 12 || 12).padStart(2, '0')}:${String(state.currentTime.getMinutes()).padStart(2, '0')}`;
        
        sensorChart.data.labels.shift();
        sensorChart.data.labels.push(timeLabel);

        sensorChart.data.datasets[0].data.shift();
        sensorChart.data.datasets[0].data.push(state.speed * 7.5);

        sensorChart.data.datasets[1].data.shift();
        sensorChart.data.datasets[1].data.push(18 + Math.random() * 6);

        sensorChart.data.datasets[2].data.shift();
        sensorChart.data.datasets[2].data.push(state.temp);

        sensorChart.data.datasets[3].data.shift();
        sensorChart.data.datasets[3].data.push(27 + Math.random() * 7);

        sensorChart.data.datasets[4].data.shift();
        sensorChart.data.datasets[4].data.push(46 + Math.random() * 7);

        sensorChart.update('none');
      }

      updateUI();
    }, 1000);
  };

  // Toast Notification System
  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const iconClass = type === 'success' ? 'fa-circle-check icon-green' : 'fa-circle-info icon-blue';
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };

  // Modal Setup
  const setupModals = () => {
    // Open Buttons
    document.getElementById('btnGenerateReport')?.addEventListener('click', () => {
      document.getElementById('modalReport').classList.add('open');
    });

    document.getElementById('btnSystemSettings')?.addEventListener('click', () => {
      document.getElementById('modalSettings').classList.add('open');
    });

    document.getElementById('btnAddMaintenanceLog')?.addEventListener('click', () => {
      document.getElementById('modalMaintLog').classList.add('open');
    });

    // Close handlers
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        document.getElementById(modalId)?.classList.remove('open');
      });
    });

    // Download Data Action
    document.getElementById('btnDownloadData')?.addEventListener('click', () => {
      const exportData = {
        system: "Intelligent Conveyor Belt Monitoring System",
        unitId: "CNV-LINE-04-A",
        timestamp: new Date().toISOString(),
        telemetry: {
          beltSpeed: `${state.speed.toFixed(2)} m/s`,
          load: `${state.load.toFixed(2)} kg`,
          temperature: `${state.temp.toFixed(1)} °C`,
          vibrationRMS: `${state.vibration.toFixed(2)} mm/s`,
          alignmentDeviation: `${state.alignment.toFixed(1)} mm`,
          beltTension: `${state.tension.toFixed(1)} kg`,
          motorCurrent: `${state.current.toFixed(2)} A`,
          powerConsumption: `${state.power.toFixed(1)} W`,
          healthScore: `${state.healthScore}%`,
          status: "NORMAL"
        },
        sensors: [
          { name: "MPU6050", type: "Vibration", value: `${state.vibration.toFixed(2)} mm/s`, status: "OK" },
          { name: "DS18B20", type: "Temperature", value: `${state.temp.toFixed(1)} °C`, status: "OK" },
          { name: "HX711", type: "Load Cell", value: `${state.load.toFixed(2)} kg`, status: "OK" },
          { name: "IR-Encoder", type: "Speed", value: `${state.speed.toFixed(2)} m/s`, status: "OK" },
          { name: "IR-Sensor", type: "Alignment", value: `${state.alignment.toFixed(1)} mm`, status: "OK" },
          { name: "INA219", type: "Current", value: `${state.current.toFixed(2)} A`, status: "OK" }
        ]
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `conveyor_telemetry_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Telemetry data exported successfully (JSON format)');
    });

    // Confirm Report Export
    document.getElementById('btnConfirmExport')?.addEventListener('click', () => {
      document.getElementById('modalReport').classList.remove('open');
      showToast('Audit Report generated and downloaded successfully');
    });

    // Save Maintenance Log
    document.getElementById('btnSaveLog')?.addEventListener('click', () => {
      document.getElementById('modalMaintLog').classList.remove('open');
      showToast('Maintenance log recorded in system database');
    });

    // Save Settings
    document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
      const speedInput = parseFloat(document.getElementById('cfgSpeed').value);
      if (!isNaN(speedInput)) state.speedSetPoint = speedInput;
      document.getElementById('modalSettings').classList.remove('open');
      showToast('System configuration & thresholds updated');
    });
  };

  // Nav item clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const viewName = item.querySelector('span').textContent;
      showToast(`Navigated to ${viewName} view`);
    });
  });

  // Mobile menu toggle
  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
  });

  // Live Stream Pause / Play toggle
  dom.simToggleBtn?.addEventListener('click', () => {
    state.isLive = !state.isLive;
    if (state.isLive) {
      dom.simToggleBtn.classList.remove('paused');
      dom.simToggleBtn.querySelector('.sim-label').textContent = 'LIVE STREAM';
      showToast('Real-time sensor streaming resumed');
    } else {
      dom.simToggleBtn.classList.add('paused');
      dom.simToggleBtn.querySelector('.sim-label').textContent = 'STREAM PAUSED';
      showToast('Sensor streaming paused (Snapshot mode)');
    }
  });

  // View all alerts modal/toast
  document.getElementById('btnViewAllAlerts')?.addEventListener('click', () => {
    showToast('Displaying 5 active notification logs');
  });

  // Trend Range Dropdown
  document.getElementById('trendRangeSelect')?.addEventListener('change', (e) => {
    showToast(`Timeframe updated to: ${e.target.options[e.target.selectedIndex].text}`);
  });

  // Initialize all components
  initChart();
  initCameraOverlay();
  updateUI();
  startSimulation();
  setupModals();
});
