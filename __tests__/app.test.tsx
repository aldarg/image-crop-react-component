import * as React from 'react';
import { shallow } from 'enzyme';
import { App } from '../src/components/App';

test('Usual flow', () => {
  const app = shallow(<App />);

  const fileContent = 'file contents';
  const file = new Blob([fileContent], { type: 'text/plain' });

  expect(app.find('.custom-file-input')).toHaveLength(1);

  app.find('#customFile').simulate('change', { target: { files: [file] } });
  jest.useFakeTimers();
  setTimeout(() => {
    expect(app.state('imageUrl')).toBeNull();
    expect(app.state('cropState')).toEqual('NONE');
  }, 1500);
  jest.runAllTimers();
});
