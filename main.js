// ==UserScript==
// @name         TEMU卖家中心导出库存价格
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  TEMU卖家中心导出库存价格, 屏蔽弹窗
// @author       HimekoEx
// @match        *://*.kuajingmaihuo.com/*
// @match        *://*.agentseller.temu.com/*
// @icon         https://bstatic.cdnfe.com/static/files/sc/favicon.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('Tampermonkey脚本启动');

    // 拦截fetch请求
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        const url = args[0];

        if (url.includes('/bg-visage-mms/product/skc/pageQuery')) {
            const clone = response.clone();
            clone.json().then(data => {
                console.log('拦截到的fetch响应:', data);
                // 如有需要, 可以将拦截到的数据存储在localStorage中
                localStorage.setItem('interceptedFetchData', JSON.stringify(data));
            }).catch(err => {
                console.error('解析fetch响应失败:', err);
            });
        }
        return response;
    };

    // 拦截XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
        this._url = args[1];
        originalOpen.apply(this, args);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('load', function() {
            if (this._url.includes('/bg-visage-mms/product/skc/pageQuery')) {
                console.log('XMLHttpRequest加载事件URL:', this._url);
                const response = this.responseText;
                try {
                    const data = JSON.parse(response);
                    console.log('拦截到的XMLHttpRequest响应:', data);
                    // 如有需要, 可以将拦截到的数据存储在localStorage中
                    localStorage.setItem('interceptedXHRData', JSON.stringify(data));
                } catch (e) {
                    console.error('解析XMLHttpRequest响应失败:', e);
                }
            }
        });
        originalSend.apply(this, args);
    };

    // 删除特定div的函数
    function removeDivs() {
        const divsToRemove = document.querySelectorAll('body > div[data-testid="beast-core-modal-mask"], body > div[data-testid="beast-core-modal"]');
        divsToRemove.forEach(div => div.remove());
    }

    // 等待页面完全加载
    window.addEventListener('load', () => {
        console.log('页面已完全加载');
        removeDivs();

        // 如果在初始加载后动态加载元素, 使用MutationObserver
        const observer = new MutationObserver(() => {
            removeDivs();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // 3秒后停止观察
        setTimeout(() => {
            observer.disconnect();
            console.log('停止观察DOM变动');
        }, 3000);

        // 检查页面URL并在特定页面添加按钮
        if (window.location.href === 'https://seller.kuajingmaihuo.com/goods/product/list') {
            console.log('在指定页面, 3秒后添加按钮');
            setTimeout(addButton, 3000);
        }
    });

    // 添加按钮的函数
    function addButton() {
        const parentDiv = document.querySelector('div.hooks_dividerLeftBlock__1d8oE');
        if (parentDiv) {
            const button = document.createElement('button');
            button.className = 'BTN_outerWrapper_5-109-0 BTN_primary_5-109-0 BTN_medium_5-109-0 BTN_outerWrapperBtn_5-109-0';
            button.setAttribute('data-testid', 'beast-core-button');
            button.setAttribute('type', 'button');
            button.style.marginLeft = '0px';
            button.style.marginRight = '8px';

            const buttonContent = document.createElement('div');
            buttonContent.className = 'product-migrate_btnContent__NRxKq';
            buttonContent.textContent = '导出库存&价格';

            button.appendChild(buttonContent);
            parentDiv.appendChild(button);

            // 添加按钮点击事件
            button.addEventListener('click', exportData);
            console.log('按钮已添加');
        } else {
            console.error('未找到目标父div, 无法添加按钮');
        }
    }

    // 导出数据的函数
    function exportData() {
        const data = localStorage.getItem('interceptedFetchData') || localStorage.getItem('interceptedXHRData');
        if (data) {
            const span = document.querySelector('span.elli_outerWrapper_5-109-0.elli_limitWidth_5-109-0');
            const fileName = span ? span.textContent.trim() : '库存价格数据';
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.json`;
            a.click();
            URL.revokeObjectURL(url);
            console.log('数据已导出');
        } else {
            console.error('没有找到要导出的数据');
        }
    }
})();
