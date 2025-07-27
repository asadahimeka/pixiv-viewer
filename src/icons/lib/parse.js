/* eslint-disable */

import convertShapeToPath from './convertShapeToPath'

function SVGtoArray(svgObj) {
  const SVGArray = []
  let node = void 0
  let subNode = void 0
  let groupNode = void 0
  let subsubNode = void 0

  for (node in svgObj) {
    if (node === 'rect' || node === 'circle' || node === 'ellipse' || node === 'polygon' || node === 'line' || node === 'path') {
      let _iteratorNormalCompletion = true
      let _didIteratorError = false
      let _iteratorError

      try {
        for (var _iterator = svgObj[node][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          subNode = _step.value

          SVGArray.push(convertShapeToPath(subNode.$, node))
        }
      } catch (err) {
        _didIteratorError = true
        _iteratorError = err
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return()
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError
          }
        }
      }
    } else if (node === 'g') {
      let _iteratorNormalCompletion2 = true
      let _didIteratorError2 = false
      let _iteratorError2

      try {
        for (var _iterator2 = svgObj[node][Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          groupNode = _step2.value

          for (subNode in groupNode) {
            if (node === 'rect' || node === 'circle' || node === 'ellipse' || node === 'polygon' || node === 'line' || node === 'path') {
              let _iteratorNormalCompletion3 = true
              let _didIteratorError3 = false
              let _iteratorError3

              try {
                for (var _iterator3 = groupNode[subNode][Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                  subsubNode = _step3.value

                  SVGArray.push(convertShapeToPath(subsubNode.$, subNode))
                }
              } catch (err) {
                _didIteratorError3 = true
                _iteratorError3 = err
              } finally {
                try {
                  if (!_iteratorNormalCompletion3 && _iterator3.return) {
                    _iterator3.return()
                  }
                } finally {
                  if (_didIteratorError3) {
                    throw _iteratorError3
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError2 = true
        _iteratorError2 = err
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return()
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2
          }
        }
      }
    }
  }
  return SVGArray
}

export { SVGtoArray }
