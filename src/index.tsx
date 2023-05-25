import { application, Container, ControlElement, customElements, customModule, Module, Panel } from '@ijstech/components';
import { } from '@ijstech/eth-contract'
import { BuilderFooter, BuilderHeader } from './builder/index';
import { EVENT } from './const/index';
import { IPageData, IElementConfig, IPageBlockData } from './interface/index';
import { PageRows, PageSidebar } from './page/index';
import { getDragData, getRootDir, setRootDir as _setRootDir, pageObject, setPageBlocks, getPageBlocks } from './store/index';
import { currentTheme } from './theme/index';
import { generateUUID } from './utility/index';
import './index.css';

const Theme = currentTheme;

interface PageBuilderElement extends ControlElement {
    rootDir?: string;
    components?: IPageBlockData[];
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            ['i-scom-page-builder']: PageBuilderElement;
        }
    }
}

@customElements("i-scom-page-builder")
@customModule
export default class Editor extends Module {
    private pageRows: PageRows;
    // private builderHeader: BuilderHeader;
    private builderFooter: BuilderFooter;
    private editor: Panel;
    private pnlWrap: Panel;
    private pageSidebar: PageSidebar;
    private events: any[] = [];

    constructor(parent?: Container, options?: any) {
        super(parent, options);
        this.getData = this.getData.bind(this);
        this.setData = this.setData.bind(this);
        this.initEventBus();
    }

    get rootDir() {
        return getRootDir();
    }

    set rootDir(value: string) {
        _setRootDir(value);
    }

    get components() {
        return getPageBlocks();
    }

    set components(value: IPageBlockData[]) {
        setPageBlocks(value);
        this.pageSidebar.renderUI();
    }

    init() {
        const rootDir = this.getAttribute('rootDir', true);
        if (rootDir) this.setRootDir(rootDir);
        const components = this.getAttribute('components', true);
        if (components) setPageBlocks(components);

        super.init();
        const self = this;
        const scrollThreshold = 80;
        this.addEventListener('dragover', (event) => {
            event.preventDefault();
            const { top, bottom } = self.pnlWrap.getBoundingClientRect();
            const mouseY = event.clientY;
            if (mouseY < top + scrollThreshold) {
                // self.pnlWrap.scrollTo({ top: 0, behavior: 'smooth' });
                self.pnlWrap.scrollTop -= 30;
            } else if (mouseY > bottom - top - scrollThreshold) {
                // self.pnlWrap.scrollTo({ top: self.pnlWrap.scrollHeight, behavior: 'smooth' });
                self.pnlWrap.scrollTop += 30;
            } else {
                self.pnlWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                // self.pnlWrap.scrollTo({ top: self.pnlWrap.scrollTop, behavior: 'smooth' });
            }
        });

        this.addEventListener('dragleave', () => {
           self.pnlWrap.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        });

        self.pnlWrap.addEventListener('drop', (event) => {
            const elementConfig = getDragData();
            if (elementConfig?.module?.name === 'sectionStack') {
                application.EventBus.dispatch(EVENT.ON_ADD_SECTION);
            }
        })
    }

    setRootDir(value: string) {
        _setRootDir(value);
    }

    getData() {
        return {
            // header: pageObject.header,
            sections: pageObject.sections, // TODO: filter(section => section.elements && section.elements.length),
            footer: pageObject.footer
        }
    }

    async setData(value: IPageData) {
        // pageObject.header = value.header;
        pageObject.sections = value?.sections || [];
        pageObject.footer = value?.footer;

        try {
            // await this.builderHeader.setData(value.header);
            await this.pageRows.setRows(value?.sections || []);
            await this.builderFooter.setData(value?.footer);
        } catch (error) {
            console.log('setdata', error)
        }
    }

    onHide() {
        for (let event of this.events) {
            event.unregister();
        }
        this.events = [];
    };

    initEventBus() {
        this.events.push(application.EventBus.register(this, EVENT.ON_ADD_ELEMENT, (data: IElementConfig) => {
            if (!data) return;
            this.onAddRow(data);
        }));
        this.events.push(application.EventBus.register(this, EVENT.ON_UPDATE_SECTIONS, async () => { }))
        this.events.push(application.EventBus.register(this, EVENT.ON_UPDATE_FOOTER, async () => this.onUpdateWrapper()));
    }

    private async onAddRow(data: IElementConfig) {
        const { type, module, prependId } = data;
        let element = {
            id: generateUUID(),
            column: 1,
            columnSpan: module.category === 'components' ? 12 : 3,
            type,
            module,
            properties: {
                showHeader: false,
                showFooter: false
            } as any
        }

        if (module.category === 'components') {
            element.properties = {
                showHeader: false,
                showFooter: false
            }     
        }
        else if (module.category === 'micro-dapps') {
            element.properties = {
                showHeader: true,
                showFooter: true
            }    
        }

        let rowData = {
            id: generateUUID(),
            row: pageObject.sections.length + 1,
            elements: [element]
        };
        //FIXME: remove this
        if (module.path === 'scom-nft-minter' || module.path === 'scom-gem-token') {
            element.module = module;
            element.columnSpan = 6;
            element.properties = {
                networks: [{
                    chainId: 43113
                }],
                wallets: [{
                    name: "metamask"
                }],
                width: '100%'
            }
        }
        return await this.pageRows.appendRow(rowData, prependId);
    }

    private onUpdateWrapper() {
        //     this.contentWrapper.minHeight = `calc((100vh - 6rem) - ${this.builderFooter.offsetHeight}px)`;
        //     this.contentWrapper.padding = {bottom: this.builderFooter.offsetHeight};
    }

    render() {
        return (
            <i-vstack id="editor" width={'100%'} height={'100%'} maxHeight="100vh" overflow={"hidden"} stack={{grow: '1'}}>
                <ide-header
                    id={'pageHeader'}
                    border={{ bottom: { width: 1, style: 'solid', color: '#dadce0' } }}
                ></ide-header>
                <i-grid-layout
                    templateColumns={['auto', 'minmax(auto, 235px)']}
                    autoFillInHoles={true}
                    height="calc(100% -64px)"
                    overflow="hidden"
                >
                    <i-panel
                        id="pnlWrap"
                        height="100%" width="100%"
                        overflow={{y: 'auto', x: 'hidden'}}
                        background={{ color: Theme.background.default }}
                        border={{ right: { width: 1, style: 'solid', color: Theme.divider } }}
                        padding={{ bottom: '1rem' }}
                    >
                        <i-panel
                            id="pageContent"
                            maxWidth={1400}
                            width="100%"
                            margin={{ left: 'auto', right: 'auto' }}
                        >
                            <i-panel
                                maxWidth={1280}
                                minHeight="100vh"
                                margin={{ top: 8, bottom: 8, left: 60, right: 60 }}
                                background={{ color: '#fff' }}
                                class="pnl-editor-wrapper"
                            >
                                <i-panel
                                    id="contentWrapper"
                                    padding={{ bottom: '12rem' }}
                                    minHeight="calc((100vh - 6rem) - 12rem)"
                                >
                                    {/* <builder-header id="builderHeader"></builder-header> */}
                                    <ide-rows id="pageRows" draggable={true}></ide-rows>
                                </i-panel>
                                <builder-footer id="builderFooter"></builder-footer>
                            </i-panel>
                        </i-panel>
                    </i-panel>
                    <i-panel height="100%" overflow={{x: 'hidden', y: 'auto'}} class="pnl-scrollable">
                        <ide-sidebar id={'pageSidebar'} display={'block'} width="100%"></ide-sidebar>
                    </i-panel>
                </i-grid-layout>
            </i-vstack>
        );
    }
}
