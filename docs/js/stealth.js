/**
 * Viewport Stealth Mode: Ultra-Realistic Corporate Spreadsheet Decoy
 * Displays authentic corporate P&L and quarterly projections while maintaining covert Morse operations
 */

export class StealthMode {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.isActive = false;
    this.autoMuteInStealth = options.autoMuteInStealth ?? false;
    this.onToggle = options.onToggle || null;

    this.covertBuffer = '';
    this.covertDecoded = '';

    this._renderDOM();
    this._bindEvents();
  }

  _renderDOM() {
    this.container.innerHTML = `
      <div class="stealth-spreadsheet" id="stealth-spreadsheet">
        <!-- Excel Header Chrome -->
        <header class="excel-titlebar">
          <div class="excel-titlebar-left">
            <span class="excel-app-icon" title="Microsoft Excel">📗</span>
            <span class="excel-doc-title">FY2024_Q3_Operations_EBITDA_Consolidated_v4.2.xlsx - Excel</span>
            <span class="excel-save-status">Saved to OneDrive</span>
          </div>
          <div class="excel-window-controls">
            <button type="button" class="excel-win-btn" title="Minimize">─</button>
            <button type="button" class="excel-win-btn" title="Restore">❐</button>
            <button type="button" class="excel-win-btn excel-win-close" id="btn-exit-stealth" title="Return to Morse Radio">✕</button>
          </div>
        </header>

        <!-- Ribbon Bar -->
        <nav class="excel-ribbon-tabs">
          <button class="ribbon-tab active">File</button>
          <button class="ribbon-tab selected">Home</button>
          <button class="ribbon-tab">Insert</button>
          <button class="ribbon-tab">Page Layout</button>
          <button class="ribbon-tab">Formulas</button>
          <button class="ribbon-tab">Data</button>
          <button class="ribbon-tab">Review</button>
          <button class="ribbon-tab">View</button>
          <button class="ribbon-tab">Automate</button>
          <button class="ribbon-tab">Help</button>
        </nav>

        <div class="excel-ribbon-toolbar">
          <div class="ribbon-group">
            <div class="ribbon-buttons-row">
              <button class="rb-btn">📋 Paste</button>
              <button class="rb-btn">✂️</button>
              <button class="rb-btn">📄</button>
            </div>
            <span class="ribbon-group-label">Clipboard</span>
          </div>
          <div class="ribbon-separator"></div>
          <div class="ribbon-group">
            <div class="ribbon-selects">
              <select class="rb-select" disabled><option>Aptos (Body)</option></select>
              <select class="rb-select rb-select-sm" disabled><option>11</option></select>
              <button class="rb-btn-sm font-bold">B</button>
              <button class="rb-btn-sm font-italic">I</button>
              <button class="rb-btn-sm font-underline">U</button>
            </div>
            <span class="ribbon-group-label">Font</span>
          </div>
          <div class="ribbon-separator"></div>
          <div class="ribbon-group">
            <div class="ribbon-buttons-row">
              <button class="rb-btn-sm">💲</button>
              <button class="rb-btn-sm">%</button>
              <button class="rb-btn-sm">,00</button>
            </div>
            <span class="ribbon-group-label">Number</span>
          </div>
          <div class="ribbon-separator"></div>
          <div class="ribbon-group">
            <div class="ribbon-buttons-row">
              <button class="rb-btn">Σ AutoSum</button>
              <button class="rb-btn">🔍 Sort & Filter</button>
            </div>
            <span class="ribbon-group-label">Editing</span>
          </div>
        </div>

        <!-- Formula Bar -->
        <div class="excel-formula-bar">
          <div class="excel-name-box" id="cell-address-display">E15</div>
          <div class="excel-fx-label">fx</div>
          <input type="text" class="excel-formula-input" id="formula-input" value="=SUM(C15:D15)" readonly />
        </div>

        <!-- Spreadsheet Grid Container -->
        <div class="excel-grid-viewport">
          <table class="excel-table" id="excel-data-table">
            <thead>
              <tr>
                <th class="cell-corner"></th>
                <th>A</th>
                <th>B</th>
                <th>C</th>
                <th>D</th>
                <th>E</th>
                <th>F</th>
                <th>G</th>
              </tr>
            </thead>
            <tbody>
              <!-- Row 1: Title -->
              <tr>
                <td class="row-num">1</td>
                <td colspan="7" class="cell-title">ACME ENTERPRISE SOLUTIONS - CONSOLIDATED STATEMENT OF OPERATIONS</td>
              </tr>
              <!-- Row 2: Subtitle -->
              <tr>
                <td class="row-num">2</td>
                <td colspan="7" class="cell-subtitle">Reporting Period: FY2024 Actuals & Q3/Q4 Projections (USD in Thousands)</td>
              </tr>
              <!-- Row 3: Blank -->
              <tr>
                <td class="row-num">3</td>
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
              <!-- Row 4: Column Headers -->
              <tr class="header-row">
                <td class="row-num">4</td>
                <td class="th-cell">Financial Line Item</td>
                <td class="th-cell num">Q1 Actual</td>
                <td class="th-cell num">Q2 Actual</td>
                <td class="th-cell num">Q3 Forecast</td>
                <td class="th-cell num">Q4 Forecast</td>
                <td class="th-cell num">FY2024 Total</td>
                <td class="th-cell num">YoY Growth %</td>
              </tr>
              <!-- Row 5: Revenue Section Header -->
              <tr class="section-row">
                <td class="row-num">5</td>
                <td class="bold">Gross Revenue</td>
                <td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
              <!-- Row 6: SaaS Subscriptions -->
              <tr>
                <td class="row-num">6</td>
                <td class="indent">SaaS Cloud ARR</td>
                <td class="num">$18,450</td>
                <td class="num">$21,300</td>
                <td class="num">$24,800</td>
                <td class="num">$28,500</td>
                <td class="num bold">$93,050</td>
                <td class="num positive">+28.4%</td>
              </tr>
              <!-- Row 7: Enterprise Licenses -->
              <tr>
                <td class="row-num">7</td>
                <td class="indent">Enterprise On-Prem Licenses</td>
                <td class="num">$4,120</td>
                <td class="num">$4,350</td>
                <td class="num">$4,400</td>
                <td class="num">$4,550</td>
                <td class="num bold">$17,420</td>
                <td class="num positive">+8.2%</td>
              </tr>
              <!-- Row 8: Professional Services -->
              <tr>
                <td class="row-num">8</td>
                <td class="indent">Professional Services & Training</td>
                <td class="num">$2,100</td>
                <td class="num">$2,380</td>
                <td class="num">$2,450</td>
                <td class="num">$2,600</td>
                <td class="num bold">$9,530</td>
                <td class="num positive">+14.1%</td>
              </tr>
              <!-- Row 9: Total Revenue -->
              <tr class="subtotal-row">
                <td class="row-num">9</td>
                <td class="bold">Total Net Revenue</td>
                <td class="num bold">$24,670</td>
                <td class="num bold">$28,030</td>
                <td class="num bold">$31,650</td>
                <td class="num bold">$35,650</td>
                <td class="num bold highlight-cell">$120,000</td>
                <td class="num bold positive">+24.6%</td>
              </tr>
              <!-- Row 10: Blank -->
              <tr>
                <td class="row-num">10</td>
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
              <!-- Row 11: COGS -->
              <tr class="section-row">
                <td class="row-num">11</td>
                <td class="bold">Cost of Revenue (COGS)</td>
                <td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
              <tr>
                <td class="row-num">12</td>
                <td class="indent">Cloud Compute & Infrastructure (AWS/GCP)</td>
                <td class="num">($3,850)</td>
                <td class="num">($4,220)</td>
                <td class="num">($4,700)</td>
                <td class="num">($5,200)</td>
                <td class="num bold">($17,970)</td>
                <td class="num">+18.5%</td>
              </tr>
              <tr>
                <td class="row-num">13</td>
                <td class="indent">Technical Customer Support Operations</td>
                <td class="num">($1,640)</td>
                <td class="num">($1,750)</td>
                <td class="num">($1,880)</td>
                <td class="num">($2,020)</td>
                <td class="num bold">($7,290)</td>
                <td class="num">+12.0%</td>
              </tr>
              <!-- Row 14: Gross Profit -->
              <tr class="subtotal-row">
                <td class="row-num">14</td>
                <td class="bold">Gross Profit</td>
                <td class="num bold">$19,180</td>
                <td class="num bold">$22,060</td>
                <td class="num bold">$25,070</td>
                <td class="num bold">$28,430</td>
                <td class="num bold">$94,740</td>
                <td class="num bold positive">+27.3%</td>
              </tr>
              <tr>
                <td class="row-num">15</td>
                <td class="indent italic">Gross Margin %</td>
                <td class="num italic">77.7%</td>
                <td class="num italic">78.7%</td>
                <td class="num italic active-cell">79.2%</td>
                <td class="num italic">79.7%</td>
                <td class="num italic bold">78.9%</td>
                <td class="num">+1.2 pts</td>
              </tr>
              <!-- Row 16: OPEX -->
              <tr class="section-row">
                <td class="row-num">16</td>
                <td class="bold">Operating Expenses (OPEX)</td>
                <td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
              <tr>
                <td class="row-num">17</td>
                <td class="indent">Research & Development (R&D)</td>
                <td class="num">($6,800)</td>
                <td class="num">($7,400)</td>
                <td class="num">($8,100)</td>
                <td class="num">($8,750)</td>
                <td class="num bold">($31,050)</td>
                <td class="num">+21.0%</td>
              </tr>
              <tr>
                <td class="row-num">18</td>
                <td class="indent">Sales & Marketing (S&M)</td>
                <td class="num">($5,200)</td>
                <td class="num">($5,950)</td>
                <td class="num">($6,600)</td>
                <td class="num">($7,300)</td>
                <td class="num bold">($25,050)</td>
                <td class="num">+23.5%</td>
              </tr>
              <tr>
                <td class="row-num">19</td>
                <td class="indent">General & Administrative (G&A)</td>
                <td class="num">($2,150)</td>
                <td class="num">($2,320)</td>
                <td class="num">($2,480)</td>
                <td class="num">($2,640)</td>
                <td class="num bold">($9,590)</td>
                <td class="num">+11.5%</td>
              </tr>
              <!-- Row 20: EBITDA -->
              <tr class="total-row">
                <td class="row-num">20</td>
                <td class="bold">Adjusted EBITDA</td>
                <td class="num bold">$5,030</td>
                <td class="num bold">$6,390</td>
                <td class="num bold">$7,890</td>
                <td class="num bold">$9,740</td>
                <td class="num bold highlight-cell">$29,050</td>
                <td class="num bold positive">+42.8%</td>
              </tr>
              <tr>
                <td class="row-num">21</td>
                <td class="indent italic">Adjusted EBITDA Margin %</td>
                <td class="num italic">20.4%</td>
                <td class="num italic">22.8%</td>
                <td class="num italic">24.9%</td>
                <td class="num italic">27.3%</td>
                <td class="num italic bold">24.2%</td>
                <td class="num positive">+3.8 pts</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sheet Tab Bar -->
        <div class="excel-sheets-bar">
          <div class="excel-sheet-tabs">
            <button class="sheet-tab active">Summary P&amp;L</button>
            <button class="sheet-tab">Dept OPEX</button>
            <button class="sheet-tab">Capex Schedule</button>
            <button class="sheet-tab">Headcount Plan</button>
            <button class="sheet-tab">Revenue Waterfall</button>
            <button class="sheet-tab sheet-add">+</button>
          </div>
        </div>

        <!-- Excel Status Bar with Discreet Covert Morse Ticker -->
        <footer class="excel-statusbar">
          <div class="excel-status-left">
            <span>Ready</span>
            <span class="status-divider">|</span>
            <span>Accessibility: Good to go</span>
            <span class="status-divider">|</span>
            <!-- Covert Morse Status HUD -->
            <span class="covert-status-box" id="covert-morse-display" title="Covert Morse Channel Active (Press Esc to return)">
              <span class="covert-dot" id="covert-indicator">●</span>
              <span class="covert-symbols" id="covert-symbols"></span>
              <span class="covert-text" id="covert-text">SECURE LINK</span>
            </span>
          </div>
          <div class="excel-status-right">
            <span>Average: $18,450</span>
            <span>Count: 16</span>
            <span>Sum: $120,000</span>
            <span class="status-divider">|</span>
            <span>100%</span>
            <button type="button" class="btn-stealth-exit" id="btn-quick-exit" title="Press Escape to exit decoy mode">
              Exit Decoy (Esc)
            </button>
          </div>
        </footer>
      </div>
    `;
  }

  _bindEvents() {
    // Global Escape key toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Exit buttons
    const exitBtn1 = this.container.querySelector('#btn-exit-stealth');
    const exitBtn2 = this.container.querySelector('#btn-quick-exit');

    exitBtn1?.addEventListener('click', () => this.setMode(false));
    exitBtn2?.addEventListener('click', () => this.setMode(false));

    // Allow clicking cells to change formula bar display
    const table = this.container.querySelector('#excel-data-table');
    const addressDisplay = this.container.querySelector('#cell-address-display');
    const formulaInput = this.container.querySelector('#formula-input');

    table?.addEventListener('click', (e) => {
      const td = e.target.closest('td');
      if (!td || td.classList.contains('row-num')) return;

      table.querySelectorAll('.active-cell').forEach(el => el.classList.remove('active-cell'));
      td.classList.add('active-cell');

      const colIndex = td.cellIndex;
      const colLetter = String.fromCharCode(64 + colIndex);
      const rowNum = td.parentElement.querySelector('.row-num')?.textContent || '1';

      if (addressDisplay) addressDisplay.textContent = `${colLetter}${rowNum}`;
      if (formulaInput) {
        formulaInput.value = td.textContent.startsWith('$')
          ? `=SUM(${colLetter}6:${colLetter}8)`
          : td.textContent;
      }
    });
  }

  setMode(active) {
    if (this.isActive === active) return;
    this.isActive = active;

    if (this.isActive) {
      this.container.classList.add('visible');
    } else {
      this.container.classList.remove('visible');
    }

    if (this.onToggle) {
      this.onToggle(this.isActive);
    }
  }

  toggle() {
    this.setMode(!this.isActive);
    return this.isActive;
  }

  /**
   * Update the subtle covert indicator in the Excel status bar
   */
  updateCovertStatus(symbols, decodedText, isKeyDown) {
    const dot = this.container.querySelector('#covert-indicator');
    const symbolsEl = this.container.querySelector('#covert-symbols');
    const textEl = this.container.querySelector('#covert-text');

    if (dot) {
      dot.style.color = isKeyDown ? '#22c55e' : '#94a3b8';
    }
    if (symbolsEl) {
      symbolsEl.textContent = symbols ? `[${symbols}]` : '';
    }
    if (textEl && decodedText) {
      textEl.textContent = decodedText.slice(-18);
    }
  }
}
