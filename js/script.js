// 全局变量
window.html5QrCodeInstance = null;
window.currentCameraId = null;
window.cameraList = [];
window.isScanning = false;

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    initializeScanner();
    setupEventListeners();
    setupMobileMenu();
    setupScrollToTop();
    setupFAQAccordion();
    checkDarkModePreference();
});

// 初始化扫描器和摄像头列表
function initializeScanner() {
    console.log("Initializing scanner...");
    if (!Html5Qrcode) {
        console.error("Html5Qrcode is not defined");
        return;
    }
    Html5Qrcode.getCameras().then(devices => {
        console.log("Cameras found:", devices);
        window.cameraList = devices;
        if (devices && devices.length) {
            // 默认使用第一个摄像头
            window.currentCameraId = devices[0].id;
            console.log("Default camera set to:", window.currentCameraId);
            // 如果有多个摄像头，显示切换按钮 (可以在setupEventListeners中处理)
        } else {
            console.warn("No cameras found.");
            showNotification(document.documentElement.lang === 'zh' ? '未检测到摄像头' : 'No cameras found', 'warning');
        }
    }).catch(err => {
        console.error("Error getting cameras:", err);
        const errorMsg = document.documentElement.lang === 'zh' ? '获取摄像头列表失败' : 'Failed to get camera list';
        // Display detailed error in UI
        const resultElement = document.getElementById('qr-reader-results');
        if (resultElement) {
            // Sanitize error message before inserting into HTML
            const sanitizedError = String(err).replace(/</g, "&lt;").replace(/>/g, "&gt;");
            resultElement.innerHTML = `<div class="result-card error-result"><p>${errorMsg}: ${sanitizedError}</p></div>`;
            resultElement.style.display = 'block';
        }
        showNotification(`${errorMsg}: ${String(err)}`, 'error'); // Keep notification as well
    });
}

// 设置事件监听器
function setupEventListeners() {
    console.log("Setting up event listeners...");
    const startScanButton = document.getElementById("start-scan-button");
    const stopScanButton = document.getElementById("stop-scan-button");
    const switchCameraButton = document.getElementById("switch-camera-button"); // Get the switch camera button
    const fileInput = document.getElementById("qr-input-file");
    const fileButton = document.getElementById("file-button"); // Get the label acting as a button

    if (startScanButton) {
        startScanButton.addEventListener("click", startScanning);
    } else {
        console.error("Start scan button not found");
    }

    if (stopScanButton) {
        stopScanButton.addEventListener("click", stopScanning);
    } else {
        console.error("Stop scan button not found");
    }

    if (switchCameraButton) {
        switchCameraButton.addEventListener("click", switchCamera); // Add listener for switch camera
    } else {
        console.error("Switch camera button not found");
    }

    if (fileInput && fileButton) {
        // Trigger file input when the label/button is clicked
        fileButton.addEventListener("click", (e) => {
            // No need to manually click fileInput if it's inside the label
            console.log("File selection triggered.");
        });
        fileInput.addEventListener("change", handleFileSelect, false);
    } else {
        console.error("File input or file button label not found");
    }
    console.log("Event listeners set up.");
}

// 切换摄像头
function switchCamera() {
    console.log("Attempting to switch camera...");
    if (!window.isScanning) {
        console.warn("Cannot switch camera when not scanning.");
        return;
    }
    if (!window.cameraList || window.cameraList.length <= 1) {
        console.warn("No other camera to switch to.");
        return;
    }

    // Find current camera index
    const currentCameraIndex = window.cameraList.findIndex(camera => camera.id === window.currentCameraId);
    if (currentCameraIndex === -1) {
        console.error("Current camera not found in list, cannot switch.");
        return;
    }

    // Calculate next camera index
    const nextCameraIndex = (currentCameraIndex + 1) % window.cameraList.length;
    const nextCameraId = window.cameraList[nextCameraIndex].id;

    console.log(`Switching camera from ${window.currentCameraId} to ${nextCameraId}`);

    // Stop current scan and start with the new camera
    // Stop scanning first
    if (window.html5QrCodeInstance) {
        window.html5QrCodeInstance.stop()
            .then(() => {
                window.isScanning = false;
                console.log("Scanning stopped for camera switch.");
                // Update current camera ID
                window.currentCameraId = nextCameraId;
                // Immediately restart scanning with the new camera
                startScanning(); 
            })
            .catch(err => {
                console.error("Error stopping scanner for camera switch:", err);
                // Attempt to reset UI anyway
                stopScanning(); 
            });
    } else {
        // Should not happen if isScanning is true, but handle defensively
        window.currentCameraId = nextCameraId;
        startScanning();
    }
}

// 开始扫描
function startScanning() {
    console.log("Attempting to start scanning...");
    if (window.isScanning) {
        console.warn("Scanning is already active.");
        return;
    }

    const qrReaderElement = document.getElementById('qr-reader');
    const startScanButton = document.getElementById('start-scan-button');
    const stopScanButton = document.getElementById('stop-scan-button');
    const switchCameraButton = document.getElementById('switch-camera-button');
    const resultElement = document.getElementById('qr-reader-results');
    const pasteContainer = document.getElementById('paste-container');

    if (!qrReaderElement || !startScanButton || !stopScanButton || !switchCameraButton || !resultElement || !pasteContainer) {
        console.error("Required elements for scanning not found.");
        showNotification(document.documentElement.lang === 'zh' ? '扫描组件丢失，请刷新页面' : 'Scanner components missing, please refresh', 'error');
        return;
    }

    // 清空之前的结果
    resultElement.innerHTML = '';
    resultElement.style.display = 'none';
    pasteContainer.style.display = 'none'; // Hide paste container
    qrReaderElement.style.display = 'block'; // Show scanner element
    startScanButton.style.display = 'none';
    stopScanButton.style.display = 'inline-block';

    // 创建新的扫描实例
    if (window.html5QrCodeInstance) {
        try {
            window.html5QrCodeInstance.clear();
        } catch(e) {
            console.warn("Could not clear existing scanner instance:", e);
        }
    }
    window.html5QrCodeInstance = new Html5Qrcode('qr-reader');

    // 获取摄像头列表
    Html5Qrcode.getCameras().then(devices => {
        console.log("Cameras found:", devices);
        window.cameraList = devices;
        
        if (devices && devices.length) {
            // Show switch camera button only if there are multiple cameras
            if (devices.length > 1) {
                switchCameraButton.style.display = 'inline-block';
            } else {
                switchCameraButton.style.display = 'none';
            }
            
            // 默认使用第一个摄像头 (or the previously selected one if logic exists)
            // If currentCameraId is not valid or not in the new list, reset to the first one
            if (!window.currentCameraId || !devices.some(d => d.id === window.currentCameraId)) {
                 window.currentCameraId = devices[0].id;
            }
            console.log("Using camera ID:", window.currentCameraId);
            
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                // aspectRatio: 1.0, // Let library handle or use videoConstraints
                // experimentalFeatures: { // Remove for broader compatibility
                //     useBarCodeDetectorIfSupported: true
                // },
                videoConstraints: {
                    facingMode: "environment", // Prioritize back camera on mobile
                    // width: { ideal: 1280 }, // Optional: Request higher resolution if needed
                    // height: { ideal: 720 }
                }
            };

            console.log(`Starting scan with camera ID: ${window.currentCameraId}`);
            window.html5QrCodeInstance.start(
                window.currentCameraId,
                config,
                (decodedText, decodedResult) => {
                    // 扫描成功回调
                    console.log("Scan successful:", decodedText);
                    stopScanning(); // 停止扫描
                    processScanResult(decodedText);
                    playScanSound(); // Play sound on success
                    vibrateDevice(); // Vibrate on success
                },
                (errorMessage) => {
                    // 扫描失败回调 (持续调用)
                    onScanFailure(errorMessage);
                }
            ).then(() => {
                window.isScanning = true;
                console.log("Scanning started successfully.");
                showNotification(document.documentElement.lang === 'zh' ? '扫描已开始' : 'Scanning started', 'info');
            }).catch((err) => {
                console.error(`Unable to start scanning, error: ${err}`);
                showNotification(`${document.documentElement.lang === 'zh' ? '无法启动扫描' : 'Unable to start scanning'}: ${err}`, 'error');
                stopScanning(); // Ensure UI resets if start fails
            });
        } else {
            console.warn("No cameras found.");
            showNotification(document.documentElement.lang === 'zh' ? '未检测到摄像头' : 'No cameras found', 'warning');
            stopScanning(); // Reset UI
        }
    }).catch(err => {
        console.error("Error getting cameras:", err);
        showNotification(document.documentElement.lang === 'zh' ? '获取摄像头列表失败' : 'Failed to get camera list', 'error');
        stopScanning(); // Reset UI
    });
}

// 停止扫描
function stopScanning() {
    console.log("Attempting to stop scanning...");
    const qrReaderElement = document.getElementById('qr-reader');
    const startScanButton = document.getElementById('start-scan-button');
    const stopScanButton = document.getElementById('stop-scan-button');
    const pasteContainer = document.getElementById('paste-container');

    if (window.html5QrCodeInstance && window.isScanning) {
        window.html5QrCodeInstance.stop().then((ignore) => {
            console.log("QR Code scanning stopped.");
            window.isScanning = false;
            if (qrReaderElement) qrReaderElement.style.display = 'none';
            if (startScanButton) startScanButton.style.display = 'inline-block';
            if (stopScanButton) stopScanButton.style.display = 'none';
            if (pasteContainer) pasteContainer.style.display = 'flex'; // Show paste container again
            window.html5QrCodeInstance = null; // Clear instance
        }).catch((err) => {
            console.error("Failed to stop scanning:", err);
            // Even if stop fails, reset UI state
            window.isScanning = false;
            if (qrReaderElement) qrReaderElement.style.display = 'none';
            if (startScanButton) startScanButton.style.display = 'inline-block';
            if (stopScanButton) stopScanButton.style.display = 'none';
            if (pasteContainer) pasteContainer.style.display = 'flex';
            window.html5QrCodeInstance = null;
        });
    } else {
        console.log("Scanner not active or instance not found.");
        // Ensure UI is in correct state even if scanner wasn't technically active
        window.isScanning = false;
        if (qrReaderElement) qrReaderElement.style.display = 'none';
        if (startScanButton) startScanButton.style.display = 'inline-block';
        if (stopScanButton) stopScanButton.style.display = 'none';
        if (pasteContainer) pasteContainer.style.display = 'flex';
        if (window.html5QrCodeInstance) {
             // Attempt cleanup if instance exists but wasn't scanning
             try { window.html5QrCodeInstance.clear(); } catch(e) {}
             window.html5QrCodeInstance = null;
        }
    }
}

// 处理文件选择
function handleFileSelect(event) {
    console.log("File selected:", event.target.files);
    if (event.target.files.length === 0) {
        console.log("No file selected.");
        return;
    }
    const file = event.target.files[0];
    scanFile(file);
}

// 扫描文件中的二维码
function scanFile(file) {
    console.log("Scanning file:", file.name);
    if (!file) return;

    const qrReaderElement = document.getElementById('qr-reader');
    const resultElement = document.getElementById('qr-reader-results');
    const pasteContainer = document.getElementById('paste-container');

    // Ensure UI is ready for result
    if (window.isScanning) {
        stopScanning(); // Stop camera scan if active
    }
    if (qrReaderElement) qrReaderElement.style.display = 'none'; // Keep scanner element hidden for file scan
    if (pasteContainer) pasteContainer.style.display = 'none'; // Hide paste container
    resultElement.innerHTML = ''; // Clear previous results
    resultElement.style.display = 'none';

    // Use Html5Qrcode instance attached to the existing element
    // Ensure the element exists
    if (!qrReaderElement) {
        console.error("QR Reader element not found for file scanning.");
        showNotification(document.documentElement.lang === 'zh' ? '扫描组件丢失' : 'Scanner component missing', 'error');
        if (pasteContainer) pasteContainer.style.display = 'flex'; // Show paste container again on failure
        return;
    }
    
    // Create a new instance specifically for this file scan, attached to the element
    // This avoids potential conflicts with the camera scanning instance state
    const fileScanner = new Html5Qrcode('qr-reader', /* verbose= */ true); 

    fileScanner.scanFile(file, /* showImage= */ false) // showImage=false might be better if we don't display the reader element
        .then(decodedText => {
            console.log("File scan successful:", decodedText);
            processScanResult(decodedText);
            playScanSound();
            vibrateDevice();
            // Cleanup the temporary instance after success
            try { fileScanner.clear(); } catch(e) { console.warn("Could not clear file scanner instance:", e); }
            if (pasteContainer) pasteContainer.style.display = 'flex'; // Show paste container again after processing
        })
        .catch(err => {
            console.error(`Error scanning file: ${err}`);
            showNotification(`${document.documentElement.lang === 'zh' ? '无法识别图片中的二维码' : 'Could not decode QR code from image'}: ${err}`, 'error');
            resultElement.innerHTML = `<div class="result-card error-result"><p>${document.documentElement.lang === 'zh' ? '无法识别图片中的二维码' : 'Could not decode QR code from image'}. ${err}</p></div>`;
            resultElement.style.display = 'block';
            // Cleanup the temporary instance on error too
            try { fileScanner.clear(); } catch(e) { console.warn("Could not clear file scanner instance on error:", e); }
            if (pasteContainer) pasteContainer.style.display = 'flex'; // Show paste container again on failure
        });
}

// 处理扫描结果
function processScanResult(text) {
    console.log("Processing scan result:", text);
    const resultElement = document.getElementById('qr-reader-results');
    const scannerElement = document.getElementById('qr-reader');
    
    if (!resultElement) {
        console.error("Result element not found for processing link.");
        return;
    }
    
    // 显示结果区域
    resultElement.style.display = 'block';
    
    // 隐藏扫描区域 (optional, might want to keep it hidden if scan stopped)
    if (scannerElement) {
        scannerElement.style.display = 'none';
    }
    
    // 检测是否为Telegram链接
    const telegramInfo = detectTelegramLink(text);
    
    let resultHTML = '';
    if (telegramInfo.isTelegramLink) {
        // 创建结果HTML
        resultHTML = createTelegramResultHTML(telegramInfo);
        showNotification(document.documentElement.lang === 'zh' ? '成功识别Telegram链接！' : 'Successfully recognized Telegram link!', 'success');
    } else {
        // 创建普通结果HTML
        resultHTML = createGenericResultHTML(text);
        showNotification(document.documentElement.lang === 'zh' ? '已识别二维码，但不是Telegram链接' : 'QR code recognized, but not a Telegram link', 'info');
    }

    // 更新结果区域
    resultElement.innerHTML = resultHTML;

    // Scroll to results
    resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 检测Telegram链接 (Improved Regex)
function detectTelegramLink(text) {
    const result = {
        isTelegramLink: false,
        originalLink: text,
        normalizedLink: '',
        type: 'unknown',
        username: '',
        hash: '',
        isBot: false,
        isChannel: false,
        isGroup: false,
        isUser: false
    };

    // Regex for various Telegram link formats (t.me, telegram.me, tg://)
    // Prioritize more specific regex first
    const telegramRegex = [
        { regex: /(?:https?:\/\/)?(?:t(?:elegram)?\.me)\/joinchat\/([a-zA-Z0-9_\-]+)/i, type: 'private_invite', groupIndex: 1 },
        { regex: /\btg:\/\/join\?invite=([a-zA-Z0-9_\-]+)/i, type: 'private_invite', groupIndex: 1 },
        { regex: /(?:https?:\/\/)?(?:t(?:elegram)?\.me)\/([a-zA-Z0-9_]{5,})/i, type: 'public_entity', groupIndex: 1 },
        { regex: /\btg:\/\/resolve\?domain=([a-zA-Z0-9_]{5,})/i, type: 'public_entity', groupIndex: 1 },
        { regex: /\btg:\/\/privatepost\?channel=([a-zA-Z0-9_]+)&post=([0-9]+)/i, type: 'private_post', groupIndex: [1, 2] },
        { regex: /\btg:\/\/proxy\?server=([^&]+)&port=([0-9]+)&secret=([a-zA-Z0-9_\-]+)/i, type: 'proxy', groupIndex: null },
        { regex: /\btg:\/\/share\?url=([^&]+)/i, type: 'share_url', groupIndex: null }
    ];

    for (const item of telegramRegex) {
        const match = text.match(item.regex);
        if (match) {
            result.isTelegramLink = true;
            result.type = item.type;

            switch (item.type) {
                case 'private_invite':
                    result.hash = match[item.groupIndex];
                    result.isGroup = true; // Assume group, could be channel
                    result.normalizedLink = `https://t.me/joinchat/${result.hash}`; // Standard web link
                    // For direct app opening, tg:// link might be better sometimes, but web link is more universal
                    // result.normalizedLink = `tg://join?invite=${result.hash}`; 
                    break;
                case 'public_entity':
                    result.username = match[item.groupIndex];
                    if (result.username.toLowerCase().endsWith('bot')) {
                        result.type = 'bot'; // Refine type
                        result.isBot = true;
                    } else {
                        result.isUser = true; // Default assumption for public entities
                    }
                    result.normalizedLink = `https://t.me/${result.username}`;
                    // result.normalizedLink = `tg://resolve?domain=${result.username}`;
                    break;
                case 'private_post':
                    // Keep original tg:// link as there's no standard web equivalent
                    result.normalizedLink = text;
                    result.isChannel = true;
                    break;
                case 'proxy':
                case 'share_url':
                    // Keep original tg:// link
                    result.normalizedLink = text;
                    break;
            }
            console.log("Detected Telegram link:", result);
            break; // Stop after first match
        }
    }
    
    // If no specific tg:// or t.me link found, check if it's just a URL pointing to t.me
    if (!result.isTelegramLink && isValidUrl(text) && text.includes('t.me/')) {
         result.isTelegramLink = true;
         result.type = 'generic_telegram_url';
         result.normalizedLink = text; // Use the original valid URL
         console.log("Detected generic Telegram URL:", result);
    }

    return result;
}

// 创建Telegram结果HTML
function createTelegramResultHTML(telegramInfo) {
    let icon, title, description, buttonText;
    const lang = document.documentElement.lang;

    switch (telegramInfo.type) {
        case 'private_invite':
            icon = '👥';
            title = lang === 'zh' ? '私有邀请链接' : 'Private Invitation Link';
            description = lang === 'zh' ? '点击下方按钮通过此链接加入Telegram群组或频道' : 'Click the button below to join the Telegram group or channel via this link';
            buttonText = lang === 'zh' ? '加入群组/频道' : 'Join Group/Channel';
            break;
        case 'bot':
            icon = '🤖';
            title = lang === 'zh' ? 'Telegram机器人' : 'Telegram Bot';
            description = lang === 'zh' ? `点击下方按钮与 @${telegramInfo.username} 机器人开始对话` : `Click the button below to start chatting with the @${telegramInfo.username} bot`;
            buttonText = lang === 'zh' ? '启动机器人' : 'Start Bot';
            break;
        case 'public_entity': // Covers user, public channel, public group
            icon = '👤'; // Default icon
            title = lang === 'zh' ? '公开链接' : 'Public Link';
            description = lang === 'zh' ? `点击下方按钮访问 @${telegramInfo.username} (用户、频道或群组)` : `Click the button below to visit @${telegramInfo.username} (User, Channel, or Group)`;
            buttonText = lang === 'zh' ? '访问链接' : 'Visit Link';
            break;
        case 'proxy':
            icon = '⚡️';
            title = lang === 'zh' ? '代理设置' : 'Proxy Settings';
            description = lang === 'zh' ? '点击下方按钮应用此Telegram代理设置' : 'Click the button below to apply these Telegram proxy settings';
            buttonText = lang === 'zh' ? '设置代理' : 'Set Proxy';
            break;
        case 'share_url':
            icon = '🔗';
            title = lang === 'zh' ? '分享链接' : 'Share Link';
            description = lang === 'zh' ? '点击下方按钮使用Telegram分享此链接' : 'Click the button below to share this link using Telegram';
            buttonText = lang === 'zh' ? '分享链接' : 'Share Link';
            break;
        case 'private_post':
             icon = '🔒';
            title = lang === 'zh' ? '私有帖子链接' : 'Private Post Link';
            description = lang === 'zh' ? '点击下方按钮在Telegram中查看此私有帖子' : 'Click the button below to view this private post in Telegram';
            buttonText = lang === 'zh' ? '查看帖子' : 'View Post';
            break;
        case 'generic_telegram_url': // Handle generic t.me URLs
             icon = '🔗';
            title = lang === 'zh' ? 'Telegram链接' : 'Telegram Link';
            description = lang === 'zh' ? '已识别一个Telegram网址' : 'A Telegram URL has been recognized';
            buttonText = lang === 'zh' ? '打开链接' : 'Open Link';
            break;
        default: // Unknown type
            icon = '🔗';
            title = lang === 'zh' ? 'Telegram链接' : 'Telegram Link';
            description = lang === 'zh' ? '已识别一个Telegram链接' : 'A Telegram link has been recognized';
            buttonText = lang === 'zh' ? '打开链接' : 'Open Link';
    }
    
    // Ensure normalizedLink is not empty
    const linkHref = telegramInfo.normalizedLink || telegramInfo.originalLink;
    console.log(`Creating button with link: ${linkHref}`); // Debugging line

    // Build HTML - CRITICAL FIX: Ensure the href is correctly assigned
    return `
        <div class="result-card telegram-result">
            <div class="result-header">
                <div class="result-icon">${icon}</div>
                <h3>${title}</h3>
            </div>
            <div class="result-content">
                <p>${description}</p>
                <a href="${linkHref}" class="telegram-link btn primary" target="_blank" rel="noopener noreferrer">
                    ${buttonText}
                </a>
                <div class="parsed-link-container">
                    <p class="parsed-link-label">${lang === 'zh' ? '链接:' : 'Link:'}</p>
                    <code class="parsed-link-text">${linkHref}</code>
                </div>
                <div class="result-details">
                    <p><strong>${lang === 'zh' ? '原始文本' : 'Original Text'}:</strong> <code class="original-text">${telegramInfo.originalLink}</code></p>
                    ${telegramInfo.username ? `<p><strong>${lang === 'zh' ? '标识符' : 'Identifier'}:</strong> @${telegramInfo.username}</p>` : ''}
                    ${telegramInfo.hash ? `<p><strong>${lang === 'zh' ? '哈希/代码' : 'Hash/Code'}:</strong> ${telegramInfo.hash}</p>` : ''}
                </div>
            </div>
        </div>
    `;
}

// 创建通用结果HTML
function createGenericResultHTML(text) {
    const lang = document.documentElement.lang;
    const isUrl = isValidUrl(text);
    const escapedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "\'"); // Escape for JS and HTML

    return `
        <div class="result-card generic-result">
            <div class="result-header">
                <div class="result-icon">📋</div>
                <h3>${lang === 'zh' ? '扫描结果' : 'Scan Result'}</h3>
            </div>
            <div class="result-content">
                <p>${lang === 'zh' ? '已识别二维码内容:' : 'Decoded QR code content:'}</p>
                <div class="generic-text-container">
                    <pre><code>${escapedText}</code></pre>
                    <button class="copy-button" onclick="copyToClipboard('${escapedText}')" title="${lang === 'zh' ? '复制到剪贴板' : 'Copy to clipboard'}">
                        <i class="far fa-copy"></i>
                    </button>
                </div>
                ${isUrl ? `
                    <a href="${text}" class="btn outline" target="_blank" rel="noopener noreferrer">
                        ${lang === 'zh' ? '打开链接' : 'Open Link'}
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

// 复制到剪贴板
function copyToClipboard(text) {
    // Decode escaped characters before copying
    const decodedText = text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\'/g, "'");
    navigator.clipboard.writeText(decodedText).then(() => {
        showNotification(document.documentElement.lang === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showNotification(document.documentElement.lang === 'zh' ? '复制失败' : 'Copy failed', 'error');
    });
}

// 检查是否为有效URL
function isValidUrl(string) {
    try {
        // Basic check + URL constructor
        if (!string || typeof string !== 'string' || !string.includes('.')) return false;
        new URL(string);
        return true;
    } catch (_) {
        return false;  
    }
}

// 扫描失败回调
function onScanFailure(error) {
    // Log only if it's not a 'QR code not found' error, which happens frequently during scanning
    const errStr = String(error);
    if (!errStr.includes("No MultiFormat Readers were able to detect the code") && 
        !errStr.includes("NotFoundException")) {
         console.debug('扫描失败:', errStr);
    }
}

// 显示通知 (全局函数)
window.showGlobalNotification = function(message, type = 'info') {
    // 移除已有的通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 添加到文档
    document.body.appendChild(notification);
    
    // 显示通知
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // 自动隐藏
    setTimeout(() => {
        if (notification.parentNode) { // Check if still in DOM
            notification.classList.remove('show');
            // 移除元素 after transition
            notification.addEventListener('transitionend', () => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, { once: true });
        }
    }, 3000);
}

// Make showNotification available globally if needed, or ensure clipboard-paste calls the global one
// For simplicity, let's alias the global function
function showNotification(message, type = 'info') {
    window.showGlobalNotification(message, type);
}

// --- 辅助功能 ---

// 播放扫描成功声音
function playScanSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn("Web Audio API is not supported in this browser.");
            return;
        }
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine'; // Sine wave is pleasant
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.warn("Could not play scan sound:", e);
    }
}

// 触发设备振动
function vibrateDevice() {
    // Check if Vibration API is supported and enabled
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        try {
            // Check if vibration is actually enabled (e.g., not disabled by user settings)
            // A short vibration pattern is often used for this check
            if (navigator.vibrate(1)) { 
                console.log("Vibration supported and enabled. Vibrating...");
                navigator.vibrate(100); // Vibrate for 100ms on success
            } else {
                // Some browsers return false/undefined if disabled, others might throw
                console.warn("Vibration supported but might be disabled by user settings or system.");
            }
        } catch (e) {
            console.warn("Could not vibrate:", e);
        }
    } else {
        console.log("Vibration API not supported in this browser.");
    }
}

// --- UI 辅助功能 ---

// 移动端菜单切换
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', () => {
            mainMenu.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', mainMenu.classList.contains('active'));
        });
    } else {
        console.warn("Mobile menu elements not found.");
    }
}

// 返回顶部按钮
function setupScrollToTop() {
    const scrollToTopButton = document.getElementById('scroll-to-top');

    if (scrollToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopButton.classList.add('show');
            } else {
                scrollToTopButton.classList.remove('show');
            }
        });

        scrollToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    } else {
        console.warn("Scroll to top button not found.");
    }
}

// FAQ 手风琴效果
function setupFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('h3'); // Assuming h3 is the clickable part
        const answer = item.querySelector('.faq-answer');

        if (question && answer) {
            question.addEventListener('click', () => {
                // Toggle active class on the item
                const isActive = item.classList.toggle('active');
                // Set ARIA expanded attribute
                question.setAttribute('aria-expanded', isActive);
                // Toggle answer visibility (optional, could be handled by CSS)
                // answer.style.display = isActive ? 'block' : 'none'; 
            });
            // Set initial ARIA state
            question.setAttribute('aria-expanded', item.classList.contains('active'));
        } else {
             console.warn("FAQ item missing question or answer element.");
        }
    });
}

// 检查并应用深色模式
function checkDarkModePreference() {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    if (prefersDarkScheme.matches) {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
    // Listen for changes
    prefersDarkScheme.addEventListener('change', (e) => {
        if (e.matches) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    });
}

