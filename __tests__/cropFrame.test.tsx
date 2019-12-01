import * as React from 'react';
import { shallow } from 'enzyme';
import CropFrame from '../src/components/CropFrame';

test('Basic test', () => {
  const style = {
    top: '0px',
    left: '0px',
    width: '100px',
    height: '100px',
  };
  const controls = ['sw', 'nw', 'ne', 'se'];
  const crop = shallow(<CropFrame style={style} controls={controls} />);

  expect(crop.find('.resize-controls').children()).toHaveLength(controls.length);
});
