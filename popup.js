document.addEventListener('DOMContentLoaded', function() {
  const svgInput = document.getElementById('svgInput');
  const confirmBtn = document.getElementById('confirmBtn');
  const exitBtn = document.getElementById('exitBtn');
  const clearInputBtn = document.getElementById('clearInput');
  const message = document.getElementById('message');
  const svgContainer = document.getElementById('svgContainer');
  const styleSelect = document.getElementById('styleSelect');
  const actionButtons = document.getElementById('actionButtons');

  // 加载保存的SVG源码
  chrome.storage.local.get(['svgSource'], function(result) {
    if (result.svgSource) {
      svgInput.value = result.svgSource;
      if (isSVG(result.svgSource)) {
        message.textContent = '有效的SVG源码';
        confirmBtn.disabled = false;
      }
    }
  });

  function isSVG(input) {
    return /<svg[\s\S]*<\/svg>/i.test(input);
  }

  svgInput.addEventListener('input', function() {
    if (isSVG(this.value)) {
      message.textContent = '有效的SVG源码';
      confirmBtn.disabled = false;
    } else {
      message.textContent = '无效的SVG源码';
      confirmBtn.disabled = true;
    }
  });

  // 保存SVG源码
  svgInput.addEventListener('blur', function() {
    chrome.storage.local.set({svgSource: this.value});
  });

  clearInputBtn.addEventListener('click', function() {
    svgInput.value = '';
    message.textContent = '';
    confirmBtn.disabled = true;
    chrome.storage.local.remove('svgSource');
    actionButtons.style.display = 'none';
    svgContainer.innerHTML = '';
  });

  confirmBtn.addEventListener('click', function() {
    renderSVG();
  });

  exitBtn.addEventListener('click', function() {
    window.close();
  });

  styleSelect.addEventListener('change', function() {
    document.body.className = this.value;
  });

  function renderSVG() {
    const svgCode = svgInput.value;
    // 移除可能存在的 XML 声明
    const cleanSvgCode = svgCode.replace(/<\?xml.*?\?>/, '').trim();
    svgContainer.innerHTML = cleanSvgCode;
    
    const svg = svgContainer.querySelector('svg');
    if (svg) {
      // 保存原始宽度和高度
      const originalWidth = svg.getAttribute('width');
      const originalHeight = svg.getAttribute('height');
      
      // 设置SVG的宽度和高度为100%以适应容器
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      
      // 添加viewBox属性（如果没有的话）
      if (!svg.getAttribute('viewBox')) {
        const bbox = svg.getBBox();
        svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
      }
      
      // 保存原始尺寸和viewBox
      svg.dataset.originalWidth = originalWidth;
      svg.dataset.originalHeight = originalHeight;
      svg.dataset.originalViewBox = svg.getAttribute('viewBox');
      
      // 显示操作按钮
      actionButtons.style.display = 'flex';
    }
  }

  function restoreOriginalSize(svg) {
    if (svg.dataset.originalWidth) svg.setAttribute('width', svg.dataset.originalWidth);
    if (svg.dataset.originalHeight) svg.setAttribute('height', svg.dataset.originalHeight);
    if (svg.dataset.originalViewBox) svg.setAttribute('viewBox', svg.dataset.originalViewBox);
  }

  function saveSVG() {
    const svg = svgContainer.querySelector('svg');
    if (!svg) {
      alert('没有可用的SVG');
      return;
    }
    restoreOriginalSize(svg);
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    chrome.downloads.download({url: url, filename: 'image.svg'});
    renderSVG(); // 重新渲染以恢复预览状态
  }

  function savePNG() {
    const svg = svgContainer.querySelector('svg');
    if (!svg) {
      alert('没有可用的SVG');
      return;
    }
    restoreOriginalSize(svg);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = function() {
      canvas.width = this.width;
      canvas.height = this.height;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({url: url, filename: 'image.png'});
      }, 'image/png');
      renderSVG(); // 重新渲染以恢复预览状态
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  function copyPNG() {
    const svg = svgContainer.querySelector('svg');
    if (!svg) {
      alert('没有可用的SVG');
      return;
    }
    restoreOriginalSize(svg);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = function() {
      canvas.width = this.width;
      canvas.height = this.height;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(function(blob) {
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]).then(function() {
          alert('原始尺寸的PNG已复制到剪贴板');
        }, function(err) {
          console.error('复制失败: ', err);
        });
      }, 'image/png');
      renderSVG(); // 重新渲染以恢复预览状态
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  document.getElementById('saveSVG').addEventListener('click', saveSVG);
  document.getElementById('savePNG').addEventListener('click', savePNG);
  document.getElementById('copyPNG').addEventListener('click', copyPNG);
});