import { getSize, checkCropBorders } from '../src/components/App';

test('unit testing, usual flow', () => {
  const rect = {
    top: 0,
    left: 0,
    bottom: 50,
    right: 100,
  };
  const bigParent = {
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
  };
  const smallParent = {
    top: 0,
    left: 0,
    bottom: 40,
    right: 90,
  };

  expect(getSize(rect)).toEqual({ width: 100, height: 50 });
  expect(checkCropBorders(rect, bigParent)).toEqual(rect);
  expect(checkCropBorders(rect, smallParent)).toEqual({ ...rect, bottom: 40, right: 90 });
});
