import { Control } from "@ijstech/components";
import { getMargin, getPageConfig, pageObject } from "../store/index";
import { ICommand } from "./interface";
import { IPageSectionConfig } from '../interface/index';

export class UpdateRowSettingsCommand implements ICommand {
  private element: any;
  private settings: IPageSectionConfig
  private oldSettings: any;

  constructor(element: Control, settings: IPageSectionConfig) {
    this.element = element;
    const id = this.element.id.replace('row-', '');
    const data = pageObject.getRowConfig(id) || getPageConfig();
    this.settings = Object.assign({}, data, settings);
    this.oldSettings = {...data};
  }

  private getChangedValues(newValue: IPageSectionConfig, oldValue: IPageSectionConfig) {
    let result = [];
    if (newValue.backgroundColor === undefined) newValue.backgroundColor = ''
    if (newValue.textColor === undefined) newValue.textColor = ''
    if (newValue.textSize === undefined) newValue.textSize = ''
    for (let prop in newValue) {
      if (prop === 'margin') {
        const { x: newX, y: newY } = newValue.margin;
        const { x: oldX, y: oldY } = oldValue.margin;
        if (newX !== oldX || newY !== oldY) result.push(prop);
      } else {
        if (newValue[prop] !== oldValue[prop]) result.push(prop);
      }
    }
    return result;
  }

  private updateConfig(config: IPageSectionConfig, updatedValues: string[]) {
    const id = this.element.id.replace('row-', '');
    const { margin } = config;
    const marginStyle = getMargin(margin);
    const newConfig = {...config, margin: {x: marginStyle.left , y: marginStyle.top}};
    pageObject.updateSection(id, {config: {...newConfig}});
    this.element.updateRowConfig(pageObject.getRowConfig(id));
  
    const { textSize, customTextSize } = newConfig
    for (let i = this.element.classList.length - 1; i >= 0; i--) {
      const className = this.element.classList[i];
      if (className.startsWith('font-')) {
          this.element.classList.remove(className);
      }
    }
    if (customTextSize && textSize) {       
      this.element.classList.add(`font-${newConfig.textSize}`)
    };
    const innerEl = this.element.querySelector('#pnlRowContainer')
    if (innerEl){
      if (newConfig.customBackgroundColor)
        innerEl.style.setProperty('--custom-background-color', newConfig.backgroundColor)
      else
        innerEl.style.removeProperty('--custom-background-color');
    };
    if (newConfig.customTextColor)
      this.element.style.setProperty('--custom-text-color', newConfig.textColor)
    else
      this.element.style.removeProperty('--custom-text-color');

    // To update markdown
    const toolbars = this.element.querySelectorAll('ide-toolbar');
    for (let toolbar of toolbars) {
      toolbar.updateUI(newConfig);
    }
  };

  execute(): void {
    const updatedValues = this.getChangedValues(this.settings, this.oldSettings);
    this.updateConfig(this.settings, updatedValues);
  }

  undo(): void {
    const updatedValues = this.getChangedValues(this.oldSettings, this.settings);
    this.updateConfig(this.oldSettings, updatedValues);
  }

  redo(): void {}
}
