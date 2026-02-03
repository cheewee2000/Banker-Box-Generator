import React, { useState, useRef, useCallback } from 'react';

const BankerBoxGenerator = () => {
  const [dimensions, setDimensions] = useState({
    width: 150,      // inside width (mm)
    depth: 100,      // inside depth (mm)
    height: 80,      // inside height (mm)
    lidHeight: 25,   // lid wall height (mm)
    materialThickness: 2,  // cardboard thickness (mm)
    tabWidth: 15,    // width of locking tabs (mm)
    tabSpacing: 30,  // spacing between tabs (mm)
    clearance: 0.5,  // assembly clearance (mm)
  });

  const [exportMode, setExportMode] = useState('screen'); // 'screen' or 'laser'
  const [showLid, setShowLid] = useState(true);
  const [showBottom, setShowBottom] = useState(true);

  const svgRef = useRef(null);

  const { width, depth, height, lidHeight, materialThickness, tabWidth, tabSpacing, clearance } = dimensions;

  // Calculate derived values
  const mt = materialThickness;
  const lidClearance = clearance * 2;
  const outerWidth = width + 2 * mt;
  const outerDepth = depth + 2 * mt;

  // Line styles
  const cutStyle = { stroke: '#000000', strokeWidth: 0.5, fill: 'none' };
  const foldStyle = exportMode === 'laser'
    ? { stroke: '#000000', strokeWidth: 0.5, fill: 'none', strokeDasharray: '5,3' }
    : { stroke: '#FF0000', strokeWidth: 0.5, fill: 'none' };

  // Generate tabs along an edge
  const generateTabs = (startX, startY, length, direction, isSlot = false) => {
    const paths = [];
    const numTabs = Math.max(1, Math.floor((length - tabWidth) / (tabWidth + tabSpacing)));
    const actualSpacing = (length - numTabs * tabWidth) / (numTabs + 1);

    for (let i = 0; i < numTabs; i++) {
      const offset = actualSpacing + i * (tabWidth + actualSpacing);
      const slotClearance = isSlot ? clearance : 0;

      if (direction === 'horizontal') {
        const x = startX + offset - slotClearance;
        const tabW = tabWidth + (isSlot ? 2 * slotClearance : 0);
        const tabH = mt + (isSlot ? clearance : 0);

        if (isSlot) {
          // Slot (rectangular hole)
          paths.push(
            <rect
              key={`slot-${i}`}
              x={x}
              y={startY - clearance/2}
              width={tabW}
              height={tabH}
              {...cutStyle}
            />
          );
        } else {
          // Tab (protrusion)
          paths.push(
            <path
              key={`tab-${i}`}
              d={`M ${x} ${startY} L ${x} ${startY + mt} L ${x + tabW} ${startY + mt} L ${x + tabW} ${startY}`}
              {...cutStyle}
            />
          );
        }
      } else {
        const y = startY + offset - slotClearance;
        const tabW = mt + (isSlot ? clearance : 0);
        const tabH = tabWidth + (isSlot ? 2 * slotClearance : 0);

        if (isSlot) {
          paths.push(
            <rect
              key={`slot-${i}`}
              x={startX - clearance/2}
              y={y}
              width={tabW}
              height={tabH}
              {...cutStyle}
            />
          );
        } else {
          paths.push(
            <path
              key={`tab-${i}`}
              d={`M ${startX} ${y} L ${startX + mt} ${y} L ${startX + mt} ${y + tabH} L ${startX} ${y + tabH}`}
              {...cutStyle}
            />
          );
        }
      }
    }
    return paths;
  };

  // Generate bottom box pattern
  const generateBottomBox = (offsetX, offsetY) => {
    const elements = [];

    // Base panel dimensions
    const baseX = offsetX + height + mt;
    const baseY = offsetY + height + mt;

    // === BASE PANEL with slots ===
    // Main base outline
    elements.push(
      <rect
        key="base"
        x={baseX}
        y={baseY}
        width={width}
        height={depth}
        {...cutStyle}
      />
    );

    // Slots in base for wall tabs
    // Front edge slots
    elements.push(...generateTabs(baseX, baseY, width, 'horizontal', true).map((el, i) =>
      React.cloneElement(el, { key: `base-front-slot-${i}` })
    ));
    // Back edge slots
    elements.push(...generateTabs(baseX, baseY + depth - mt, width, 'horizontal', true).map((el, i) =>
      React.cloneElement(el, { key: `base-back-slot-${i}` })
    ));
    // Left edge slots
    elements.push(...generateTabs(baseX, baseY, depth, 'vertical', true).map((el, i) =>
      React.cloneElement(el, { key: `base-left-slot-${i}` })
    ));
    // Right edge slots
    elements.push(...generateTabs(baseX + width - mt, baseY, depth, 'vertical', true).map((el, i) =>
      React.cloneElement(el, { key: `base-right-slot-${i}` })
    ));

    // === FRONT WALL (folds down from base) ===
    // Outer wall
    elements.push(
      <rect
        key="front-wall"
        x={baseX}
        y={baseY - height}
        width={width}
        height={height}
        {...cutStyle}
      />
    );
    // Fold line at base
    elements.push(
      <line
        key="front-fold"
        x1={baseX}
        y1={baseY}
        x2={baseX + width}
        y2={baseY}
        {...foldStyle}
      />
    );
    // Inner wall panel (folds back)
    elements.push(
      <rect
        key="front-inner"
        x={baseX}
        y={baseY - height - height + mt}
        width={width}
        height={height - mt}
        {...cutStyle}
      />
    );
    // Fold line for inner panel
    elements.push(
      <line
        key="front-inner-fold"
        x1={baseX}
        y1={baseY - height}
        x2={baseX + width}
        y2={baseY - height}
        {...foldStyle}
      />
    );
    // Tabs on inner panel bottom
    elements.push(...generateTabs(baseX, baseY - height - height + mt, width, 'horizontal', false).map((el, i) =>
      React.cloneElement(el, { key: `front-inner-tab-${i}` })
    ));

    // Side flaps for front wall
    // Left flap
    elements.push(
      <path
        key="front-left-flap"
        d={`M ${baseX} ${baseY - height} L ${baseX - mt} ${baseY - height} L ${baseX - mt} ${baseY} L ${baseX} ${baseY}`}
        {...cutStyle}
      />
    );
    elements.push(<line key="front-left-flap-fold" x1={baseX} y1={baseY - height} x2={baseX} y2={baseY} {...foldStyle} />);

    // Right flap
    elements.push(
      <path
        key="front-right-flap"
        d={`M ${baseX + width} ${baseY - height} L ${baseX + width + mt} ${baseY - height} L ${baseX + width + mt} ${baseY} L ${baseX + width} ${baseY}`}
        {...cutStyle}
      />
    );
    elements.push(<line key="front-right-flap-fold" x1={baseX + width} y1={baseY - height} x2={baseX + width} y2={baseY} {...foldStyle} />);

    // === BACK WALL (folds up from base) ===
    elements.push(
      <rect
        key="back-wall"
        x={baseX}
        y={baseY + depth}
        width={width}
        height={height}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="back-fold"
        x1={baseX}
        y1={baseY + depth}
        x2={baseX + width}
        y2={baseY + depth}
        {...foldStyle}
      />
    );
    // Inner wall panel
    elements.push(
      <rect
        key="back-inner"
        x={baseX}
        y={baseY + depth + height}
        width={width}
        height={height - mt}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="back-inner-fold"
        x1={baseX}
        y1={baseY + depth + height}
        x2={baseX + width}
        y2={baseY + depth + height}
        {...foldStyle}
      />
    );
    // Tabs on inner panel
    elements.push(...generateTabs(baseX, baseY + depth + 2*height - mt, width, 'horizontal', false).map((el, i) =>
      React.cloneElement(el, { key: `back-inner-tab-${i}` })
    ));

    // Side flaps for back wall
    elements.push(
      <path
        key="back-left-flap"
        d={`M ${baseX} ${baseY + depth} L ${baseX - mt} ${baseY + depth} L ${baseX - mt} ${baseY + depth + height} L ${baseX} ${baseY + depth + height}`}
        {...cutStyle}
      />
    );
    elements.push(<line key="back-left-flap-fold" x1={baseX} y1={baseY + depth} x2={baseX} y2={baseY + depth + height} {...foldStyle} />);

    elements.push(
      <path
        key="back-right-flap"
        d={`M ${baseX + width} ${baseY + depth} L ${baseX + width + mt} ${baseY + depth} L ${baseX + width + mt} ${baseY + depth + height} L ${baseX + width} ${baseY + depth + height}`}
        {...cutStyle}
      />
    );
    elements.push(<line key="back-right-flap-fold" x1={baseX + width} y1={baseY + depth} x2={baseX + width} y2={baseY + depth + height} {...foldStyle} />);

    // === LEFT WALL ===
    elements.push(
      <rect
        key="left-wall"
        x={baseX - height}
        y={baseY}
        width={height}
        height={depth}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="left-fold"
        x1={baseX}
        y1={baseY}
        x2={baseX}
        y2={baseY + depth}
        {...foldStyle}
      />
    );
    // Inner panel
    elements.push(
      <rect
        key="left-inner"
        x={baseX - height - height + mt}
        y={baseY}
        width={height - mt}
        height={depth}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="left-inner-fold"
        x1={baseX - height}
        y1={baseY}
        x2={baseX - height}
        y2={baseY + depth}
        {...foldStyle}
      />
    );
    // Tabs
    elements.push(...generateTabs(baseX - height - height + mt, baseY, depth, 'vertical', false).map((el, i) =>
      React.cloneElement(el, { key: `left-inner-tab-${i}` })
    ));

    // === RIGHT WALL ===
    elements.push(
      <rect
        key="right-wall"
        x={baseX + width}
        y={baseY}
        width={height}
        height={depth}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="right-fold"
        x1={baseX + width}
        y1={baseY}
        x2={baseX + width}
        y2={baseY + depth}
        {...foldStyle}
      />
    );
    // Inner panel
    elements.push(
      <rect
        key="right-inner"
        x={baseX + width + height}
        y={baseY}
        width={height - mt}
        height={depth}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="right-inner-fold"
        x1={baseX + width + height}
        y1={baseY}
        x2={baseX + width + height}
        y2={baseY + depth}
        {...foldStyle}
      />
    );
    // Tabs
    elements.push(...generateTabs(baseX + width + 2*height - mt, baseY, depth, 'vertical', false).map((el, i) =>
      React.cloneElement(el, { key: `right-inner-tab-${i}` })
    ));

    return <g key="bottom-box">{elements}</g>;
  };

  // Generate lid pattern
  const generateLid = (offsetX, offsetY) => {
    const elements = [];

    // Lid is larger to fit over the box
    const lidW = width + 2 * mt + lidClearance;
    const lidD = depth + 2 * mt + lidClearance;
    const lh = lidHeight;

    const baseX = offsetX + lh + mt;
    const baseY = offsetY + lh + mt;

    // === TOP PANEL with slots ===
    elements.push(
      <rect
        key="lid-top"
        x={baseX}
        y={baseY}
        width={lidW}
        height={lidD}
        {...cutStyle}
      />
    );

    // Slots in top for wall tabs
    elements.push(...generateTabs(baseX, baseY, lidW, 'horizontal', true).map((el, i) =>
      React.cloneElement(el, { key: `lid-front-slot-${i}` })
    ));
    elements.push(...generateTabs(baseX, baseY + lidD - mt, lidW, 'horizontal', true).map((el, i) =>
      React.cloneElement(el, { key: `lid-back-slot-${i}` })
    ));
    elements.push(...generateTabs(baseX, baseY, lidD, 'vertical', true).map((el, i) =>
      React.cloneElement(el, { key: `lid-left-slot-${i}` })
    ));
    elements.push(...generateTabs(baseX + lidW - mt, baseY, lidD, 'vertical', true).map((el, i) =>
      React.cloneElement(el, { key: `lid-right-slot-${i}` })
    ));

    // === FRONT LID WALL ===
    elements.push(
      <rect
        key="lid-front-wall"
        x={baseX}
        y={baseY - lh}
        width={lidW}
        height={lh}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="lid-front-fold"
        x1={baseX}
        y1={baseY}
        x2={baseX + lidW}
        y2={baseY}
        {...foldStyle}
      />
    );
    // Inner panel
    elements.push(
      <rect
        key="lid-front-inner"
        x={baseX}
        y={baseY - lh - lh + mt}
        width={lidW}
        height={lh - mt}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="lid-front-inner-fold"
        x1={baseX}
        y1={baseY - lh}
        x2={baseX + lidW}
        y2={baseY - lh}
        {...foldStyle}
      />
    );
    elements.push(...generateTabs(baseX, baseY - 2*lh + mt, lidW, 'horizontal', false).map((el, i) =>
      React.cloneElement(el, { key: `lid-front-inner-tab-${i}` })
    ));

    // Side flaps
    elements.push(
      <path
        key="lid-front-left-flap"
        d={`M ${baseX} ${baseY - lh} L ${baseX - mt} ${baseY - lh} L ${baseX - mt} ${baseY} L ${baseX} ${baseY}`}
        {...cutStyle}
      />
    );
    elements.push(<line key="lid-front-left-flap-fold" x1={baseX} y1={baseY - lh} x2={baseX} y2={baseY} {...foldStyle} />);

    elements.push(
      <path
        key="lid-front-right-flap"
        d={`M ${baseX + lidW} ${baseY - lh} L ${baseX + lidW + mt} ${baseY - lh} L ${baseX + lidW + mt} ${baseY} L ${baseX + lidW} ${baseY}`}
        {...cutStyle}
      />
    );
    elements.push(<line key="lid-front-right-flap-fold" x1={baseX + lidW} y1={baseY - lh} x2={baseX + lidW} y2={baseY} {...foldStyle} />);

    // === BACK LID WALL ===
    elements.push(
      <rect
        key="lid-back-wall"
        x={baseX}
        y={baseY + lidD}
        width={lidW}
        height={lh}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="lid-back-fold"
        x1={baseX}
        y1={baseY + lidD}
        x2={baseX + lidW}
        y2={baseY + lidD}
        {...foldStyle}
      />
    );
    elements.push(
      <rect
        key="lid-back-inner"
        x={baseX}
        y={baseY + lidD + lh}
        width={lidW}
        height={lh - mt}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="lid-back-inner-fold"
        x1={baseX}
        y1={baseY + lidD + lh}
        x2={baseX + lidW}
        y2={baseY + lidD + lh}
        {...foldStyle}
      />
    );
    elements.push(...generateTabs(baseX, baseY + lidD + 2*lh - mt, lidW, 'horizontal', false).map((el, i) =>
      React.cloneElement(el, { key: `lid-back-inner-tab-${i}` })
    ));

    // Side flaps
    elements.push(
      <path
        key="lid-back-left-flap"
        d={`M ${baseX} ${baseY + lidD} L ${baseX - mt} ${baseY + lidD} L ${baseX - mt} ${baseY + lidD + lh} L ${baseX} ${baseY + lidD + lh}`}
        {...cutStyle}
      />
    );
    elements.push(<line key="lid-back-left-flap-fold" x1={baseX} y1={baseY + lidD} x2={baseX} y2={baseY + lidD + lh} {...foldStyle} />);

    elements.push(
      <path
        key="lid-back-right-flap"
        d={`M ${baseX + lidW} ${baseY + lidD} L ${baseX + lidW + mt} ${baseY + lidD} L ${baseX + lidW + mt} ${baseY + lidD + lh} L ${baseX + lidW} ${baseY + lidD + lh}`}
        {...cutStyle}
      />
    );
    elements.push(<line key="lid-back-right-flap-fold" x1={baseX + lidW} y1={baseY + lidD} x2={baseX + lidW} y2={baseY + lidD + lh} {...foldStyle} />);

    // === LEFT LID WALL ===
    elements.push(
      <rect
        key="lid-left-wall"
        x={baseX - lh}
        y={baseY}
        width={lh}
        height={lidD}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="lid-left-fold"
        x1={baseX}
        y1={baseY}
        x2={baseX}
        y2={baseY + lidD}
        {...foldStyle}
      />
    );
    elements.push(
      <rect
        key="lid-left-inner"
        x={baseX - lh - lh + mt}
        y={baseY}
        width={lh - mt}
        height={lidD}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="lid-left-inner-fold"
        x1={baseX - lh}
        y1={baseY}
        x2={baseX - lh}
        y2={baseY + lidD}
        {...foldStyle}
      />
    );
    elements.push(...generateTabs(baseX - 2*lh + mt, baseY, lidD, 'vertical', false).map((el, i) =>
      React.cloneElement(el, { key: `lid-left-inner-tab-${i}` })
    ));

    // === RIGHT LID WALL ===
    elements.push(
      <rect
        key="lid-right-wall"
        x={baseX + lidW}
        y={baseY}
        width={lh}
        height={lidD}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="lid-right-fold"
        x1={baseX + lidW}
        y1={baseY}
        x2={baseX + lidW}
        y2={baseY + lidD}
        {...foldStyle}
      />
    );
    elements.push(
      <rect
        key="lid-right-inner"
        x={baseX + lidW + lh}
        y={baseY}
        width={lh - mt}
        height={lidD}
        {...cutStyle}
      />
    );
    elements.push(
      <line
        key="lid-right-inner-fold"
        x1={baseX + lidW + lh}
        y1={baseY}
        x2={baseX + lidW + lh}
        y2={baseY + lidD}
        {...foldStyle}
      />
    );
    elements.push(...generateTabs(baseX + lidW + 2*lh - mt, baseY, lidD, 'vertical', false).map((el, i) =>
      React.cloneElement(el, { key: `lid-right-inner-tab-${i}` })
    ));

    return <g key="lid">{elements}</g>;
  };

  // Calculate total SVG dimensions
  const bottomWidth = width + 4 * height + 4 * mt;
  const bottomHeight = depth + 4 * height + 4 * mt;
  const lidW = width + 2 * mt + lidClearance;
  const lidD = depth + 2 * mt + lidClearance;
  const lidTotalWidth = lidW + 4 * lidHeight + 4 * mt;
  const lidTotalHeight = lidD + 4 * lidHeight + 4 * mt;

  const padding = 20;
  const svgWidth = Math.max(showBottom ? bottomWidth : 0, showLid ? lidTotalWidth : 0) + 2 * padding;
  const svgHeight = (showBottom ? bottomHeight : 0) + (showLid ? lidTotalHeight : 0) + (showBottom && showLid ? padding : 0) + 2 * padding;

  // Export SVG function
  const exportSVG = useCallback(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // Add XML declaration and proper namespace
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `banker-box-${width}x${depth}x${height}mm-${exportMode}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [width, depth, height, exportMode]);

  const handleDimensionChange = (key, value) => {
    const numValue = parseFloat(value) || 0;
    setDimensions(prev => ({ ...prev, [key]: numValue }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Banker Box Die Cut Pattern Generator</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Box Dimensions (mm)</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inside Width</label>
                <input
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => handleDimensionChange('width', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inside Depth</label>
                <input
                  type="number"
                  value={dimensions.depth}
                  onChange={(e) => handleDimensionChange('depth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inside Height</label>
                <input
                  type="number"
                  value={dimensions.height}
                  onChange={(e) => handleDimensionChange('height', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lid Wall Height</label>
                <input
                  type="number"
                  value={dimensions.lidHeight}
                  onChange={(e) => handleDimensionChange('lidHeight', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <hr className="my-4" />
              <h3 className="text-lg font-medium">Advanced Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Thickness</label>
                <input
                  type="number"
                  step="0.1"
                  value={dimensions.materialThickness}
                  onChange={(e) => handleDimensionChange('materialThickness', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tab Width</label>
                <input
                  type="number"
                  value={dimensions.tabWidth}
                  onChange={(e) => handleDimensionChange('tabWidth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tab Spacing</label>
                <input
                  type="number"
                  value={dimensions.tabSpacing}
                  onChange={(e) => handleDimensionChange('tabSpacing', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Clearance</label>
                <input
                  type="number"
                  step="0.1"
                  value={dimensions.clearance}
                  onChange={(e) => handleDimensionChange('clearance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <hr className="my-4" />
              <h3 className="text-lg font-medium">Display Options</h3>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBottom}
                    onChange={(e) => setShowBottom(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Show Bottom Box</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showLid}
                    onChange={(e) => setShowLid(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Show Lid</span>
                </label>
              </div>

              <hr className="my-4" />
              <h3 className="text-lg font-medium">Export Mode</h3>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="exportMode"
                    value="screen"
                    checked={exportMode === 'screen'}
                    onChange={() => setExportMode('screen')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Screen View (Red fold lines)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="exportMode"
                    value="laser"
                    checked={exportMode === 'laser'}
                    onChange={() => setExportMode('laser')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Laser Cutting (Dashed fold lines)</span>
                </label>
              </div>

              <button
                onClick={exportSVG}
                className="w-full mt-4 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export SVG
              </button>
            </div>

            {/* Legend */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Legend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-black"></div>
                  <span>Cut lines</span>
                </div>
                <div className="flex items-center gap-2">
                  {exportMode === 'laser' ? (
                    <div className="w-8 h-0.5 border-t-2 border-dashed border-black"></div>
                  ) : (
                    <div className="w-8 h-0.5 bg-red-500"></div>
                  )}
                  <span>Fold lines</span>
                </div>
              </div>
            </div>

            {/* Dimensions Summary */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
              <h3 className="font-medium mb-2">Pattern Size Summary</h3>
              <p>Bottom: {bottomWidth.toFixed(1)} × {bottomHeight.toFixed(1)} mm</p>
              <p>Lid: {lidTotalWidth.toFixed(1)} × {lidTotalHeight.toFixed(1)} mm</p>
            </div>
          </div>

          {/* SVG Preview */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Pattern Preview</h2>
            <div className="overflow-auto border border-gray-200 rounded-lg bg-gray-50 p-4" style={{ maxHeight: '80vh' }}>
              <svg
                ref={svgRef}
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                xmlns="http://www.w3.org/2000/svg"
                className="bg-white"
              >
                {showBottom && generateBottomBox(padding, padding)}
                {showLid && generateLid(padding, showBottom ? bottomHeight + padding * 2 : padding)}
              </svg>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Assembly Instructions</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium mb-2">Bottom Box Assembly</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Cut out the pattern along all black cut lines</li>
                <li>Score all fold lines (red/dashed) for easier folding</li>
                <li>Fold the four walls up from the base</li>
                <li>Fold the corner flaps inward</li>
                <li>Fold the inner wall panels back down into the box</li>
                <li>Insert tabs through slots in the base to lock the walls</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium mb-2">Lid Assembly</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Cut out the lid pattern along all cut lines</li>
                <li>Score all fold lines</li>
                <li>Fold the four walls down from the top panel</li>
                <li>Fold corner flaps inward</li>
                <li>Fold inner panels up inside the walls</li>
                <li>Insert tabs through slots to lock</li>
                <li>Place lid over the bottom box</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankerBoxGenerator;
