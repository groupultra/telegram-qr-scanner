// 剪贴板图片粘贴功能
document.addEventListener("DOMContentLoaded", function() {
    initClipboardPaste();
});

// 初始化剪贴板粘贴功能
function initClipboardPaste() {
    const pasteContainer = document.getElementById("paste-container");
    if (!pasteContainer) return;
    
    // 添加粘贴事件监听
    document.addEventListener("paste", function(e) {
        handlePaste(e);
    });
    
    // 为粘贴容器添加点击事件
    pasteContainer.addEventListener("click", function() {
        // 提示用户粘贴
        showClipboardNotification(document.documentElement.lang === "zh" ? "请按Ctrl+V或⌘+V粘贴图片" : "Please press Ctrl+V or ⌘+V to paste an image", "info");
    });
    
    // 添加拖放事件监听
    pasteContainer.addEventListener("dragover", function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add("drag-over");
    });
    
    pasteContainer.addEventListener("dragleave", function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove("drag-over");
    });
    
    pasteContainer.addEventListener("drop", function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove("drag-over");
        
        // 处理拖放的文件
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith("image/")) {
                handleImageFile(file);
            } else {
                showClipboardNotification(document.documentElement.lang === "zh" ? "请拖放图片文件" : "Please drop an image file", "error");
            }
        }
    });
}

// 处理粘贴事件
function handlePaste(e) {
    console.log("Paste event triggered");
    // 检查是否有剪贴板数据
    if (!e.clipboardData) {
        console.warn("clipboardData is null");
        // Maybe show a message that paste is not supported or failed
        showClipboardNotification(document.documentElement.lang === "zh" ? "无法访问剪贴板数据" : "Cannot access clipboard data", "warning");
        return;
    }

    const items = e.clipboardData.items;
    if (!items) {
        console.warn("clipboardData.items is null");
        // Try accessing files directly (older browsers?)
        const files = e.clipboardData.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                if (files[i].type.startsWith("image/")) {
                    console.log("Found image file in clipboardData.files");
                    handleImageFile(files[i]);
                    e.preventDefault(); // Prevent default paste action if we handled it
                    return; // Handle first image found
                }
            }
        } else {
             showClipboardNotification(document.documentElement.lang === "zh" ? "剪贴板中未找到图片" : "No image found in clipboard", "info");
        }
        return;
    }

    console.log(`Found ${items.length} clipboard items`);
    let imageItem = null;
    for (let i = 0; i < items.length; i++) {
        console.log(`Item ${i}: kind=${items[i].kind}, type=${items[i].type}`);
        // Prioritize file items that are images
        if (items[i].kind === 'file' && items[i].type.startsWith("image/")) {
            imageItem = items[i];
            console.log(`Found image item (kind=file) at index ${i}`);
            break;
        }
    }

    // Fallback: Check for string items that might be image data URLs (less common for paste)
    if (!imageItem) {
         for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'string' && items[i].type === 'text/plain') {
                items[i].getAsString(function(s) {
                    if (s.startsWith('data:image/')) {
                        console.log("Found image data URL in clipboard string");
                        // Convert data URL string to blob/file and handle it
                        // This is more complex and might not be needed if getAsFile works
                        // For now, just log it
                        console.log("Data URL found, but handling not implemented in this path.");
                    }
                });
            }
        }
    }

    // 如果找到图片项
    if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
            console.log("Got file from image item:", file);
            handleImageFile(file);
            e.preventDefault(); // Prevent default paste action if we handled it
        } else {
            console.error("Could not get file from image item.");
            showClipboardNotification(document.documentElement.lang === "zh" ? "无法从剪贴板获取图片文件" : "Could not get image file from clipboard", "error");
        }
    } else {
        console.log("No image item found in clipboard items.");
        showClipboardNotification(document.documentElement.lang === "zh" ? "剪贴板中未找到图片" : "No image found in clipboard", "info");
    }
}

// 处理图片文件
function handleImageFile(file) {
    const pasteContainer = document.getElementById("paste-container");
    const pastePreview = document.getElementById("paste-preview");
    const pasteClear = document.getElementById("paste-clear");
    
    if (!pasteContainer || !pastePreview || !pasteClear) return;
    
    // 创建文件读取器
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // 设置预览图片
        pastePreview.src = e.target.result;
        pastePreview.classList.add("visible");
        
        // 显示清除按钮
        pasteClear.classList.add("visible");
        
        // 添加清除按钮事件
        pasteClear.onclick = function(e) {
            e.stopPropagation();
            clearPastePreview();
        };
        
        // 扫描图片
        scanPastedImage(file);
    };
    
    reader.readAsDataURL(file);
}

// 清除粘贴预览
function clearPastePreview() {
    const pastePreview = document.getElementById("paste-preview");
    const pasteClear = document.getElementById("paste-clear");
    
    if (pastePreview) {
        pastePreview.src = "";
        pastePreview.classList.remove("visible");
    }
    
    if (pasteClear) {
        pasteClear.classList.remove("visible");
    }
}

// 扫描粘贴的图片
function scanPastedImage(file) {
    // 检查是否已初始化扫描器
    if (typeof Html5Qrcode === "undefined") {
        showClipboardNotification(document.documentElement.lang === "zh" ? "正在加载扫描器，请稍候..." : "Loading scanner, please wait...", "info");
        
        // 加载扫描器脚本 (Ensure it's loaded only once if needed)
        if (!document.querySelector("script[src*=\"html5-qrcode\"]")) {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
            script.onload = function() {
                // 脚本加载完成后扫描
                scanImageWithQrCode(file);
            };
            document.head.appendChild(script);
        } else {
             // If script tag exists but Html5Qrcode is not defined, wait a bit
             setTimeout(() => scanImageWithQrCode(file), 500);
        }
    } else {
        // 直接扫描
        scanImageWithQrCode(file);
    }
}

// 使用QR扫描器扫描图片
function scanImageWithQrCode(file) {
    // 显示加载指示器
    showClipboardLoadingIndicator();
    
    // 初始化扫描器实例 (Use the global instance from script.js)
    if (!window.html5QrCodeInstance) {
        // Attempt to initialize if not already done (should be done in script.js)
        const scannerElement = document.getElementById("qr-reader");
        if (scannerElement) {
             window.html5QrCodeInstance = new Html5Qrcode("qr-reader");
        } else {
            console.error("QR Reader element not found when trying to scan image.");
            showClipboardNotification("扫描器初始化失败", "error");
            hideClipboardLoadingIndicator();
            return;
        }
    }
    
    // 扫描文件
    window.html5QrCodeInstance.scanFile(file, true) // showImage=true
        .then(decodedText => {
            // 处理扫描结果 - Call the function from script.js
            if (typeof processScanResult === "function") {
                processScanResult(decodedText);
                hideClipboardLoadingIndicator(); // Hide indicator after processing
                clearPastePreview(); // Clear preview after processing
            } else {
                // Fallback if main function is not available (should not happen)
                console.error("processScanResult function not found in main script.");
                // processClipboardScanResult(decodedText); // Remove fallback call
                hideClipboardLoadingIndicator(); // Still hide indicator on error
            }
        })
        .catch(err => {
            console.error("文件扫描失败:", err);
            showClipboardNotification(document.documentElement.lang === "zh" ? "无法识别二维码，请尝试其他图片" : "Could not recognize QR code, please try another image", "error");
            hideClipboardLoadingIndicator();
        });
}

// 处理扫描结果 (Local Fallback)
function processClipboardScanResult(decodedText) {
    console.log("扫描成功 (Clipboard Fallback):", decodedText);
    hideClipboardLoadingIndicator();
    clearPastePreview();
    showClipboardNotification(document.documentElement.lang === "zh" ? "已识别二维码: " + decodedText : "QR Code recognized: " + decodedText, "success");
    // Note: This fallback doesn't create the Telegram link button
}

// 显示加载指示器 (Local version to avoid conflicts)
function showClipboardLoadingIndicator() {
    // Check if the main script's function exists and use it
    if (typeof window.showLoadingIndicator === "function") {
        window.showLoadingIndicator();
        return;
    }
    
    // Fallback implementation if main function is not available
    const pasteContainer = document.getElementById("paste-container");
    const container = pasteContainer || document.body;
    
    // Remove existing indicator
    const existingIndicator = container.querySelector(".loading-indicator-clipboard");
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Create indicator
    const indicatorElement = document.createElement("div");
    indicatorElement.className = "loading-indicator loading-indicator-clipboard"; // Use a specific class
    
    const spinnerElement = document.createElement("div");
    spinnerElement.className = "loading-spinner";
    indicatorElement.appendChild(spinnerElement);
    
    const textElement = document.createElement("p");
    textElement.textContent = document.documentElement.lang === "zh" ? "正在处理..." : "Processing...";
    indicatorElement.appendChild(textElement);
    
    container.appendChild(indicatorElement);
}

// 隐藏加载指示器 (Local version)
function hideClipboardLoadingIndicator() {
    // Check if the main script's function exists and use it
    if (typeof window.hideLoadingIndicator === "function") {
        window.hideLoadingIndicator();
        return;
    }
    
    // Fallback implementation
    const indicator = document.querySelector(".loading-indicator-clipboard");
    if (indicator) {
        indicator.remove();
    }
}

// 显示通知 (Local version to avoid recursion)
function showClipboardNotification(message, type = "info") {
    // *** CRITICAL FIX: Check and call the GLOBAL showNotification if it exists ***
    if (typeof window.showNotification === "function") {
        window.showNotification(message, type);
        return; // Exit after calling the global function
    }
    
    // Fallback implementation ONLY if global function is not available
    console.warn("Global showNotification not found, using fallback in clipboard-paste.js");
    
    // Remove existing fallback notification
    const existingNotification = document.querySelector(".clipboard-notification");
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement("div");
    // Use a different class to avoid conflict with global notification styling/removal
    notification.className = `notification clipboard-notification ${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show notification
    requestAnimationFrame(() => {
        notification.classList.add("show");
    });
    
    // Auto-hide
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove("show");
            notification.addEventListener("transitionend", () => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, { once: true });
        }
    }, 3000);
}

