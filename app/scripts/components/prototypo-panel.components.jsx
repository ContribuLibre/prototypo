import React from 'react';
import LocalClient from '../stores/local-client.stores.jsx';
import Lifespan from 'lifespan';
import ClassNames from 'classnames';

import PrototypoText from './prototypo-text.components.jsx';
import PrototypoCanvas from './prototypo-canvas.components.jsx';
import PrototypoWord from './prototypo-word.components.jsx';
import HoverViewMenu from './hover-view-menu.components.jsx';


export default class PrototypoPanel extends React.Component {

	constructor(props) {
		super(props);

		this.state = {
			contextMenuPos:{x:0,y:0},
			showContextMenu:false,
			glyph:{},
			panel: {
				mode:['text'],
			},
		};
	}

	async componentWillMount() {
		this.client = LocalClient.instance();
		this.lifespan = new Lifespan();

		this.client.getStore('/panel',this.lifespan)
			.onUpdate(({head}) => {
				this.setState({panel:head.toJS()});
			})
			.onDelete(() => {
				this.setState({panel:undefined});
			});

		this.client.getStore('/glyphs',this.lifespan)
			.onUpdate(({head}) => {
				this.setState({glyph:head.toJS()});
			})
			.onDelete(() => {
				this.setState({glyph:undefined});
			});
	}

	resetView() {
		this.client.dispatchAction('/store-panel-param', {
			pos:new prototypo.paper.Point(0,0),
			zoom:0.5,
		})
	}

	componentWillUnmount() {
		this.lifespan.release();
	}

	toggleView(name) {
		const newViewMode = _.xor(this.state.panel.mode, [name]);
		if (newViewMode.length > 0) {
			this.client.dispatchAction('/store-panel-param',{mode:newViewMode});
		}
	}

	render() {
		if (process.env.__SHOW_RENDER__) {
			console.log('[RENDER] prototypopanel');
			//console.trace();
		}

		let textAndGlyph;
		let word;

		textAndGlyph = [<PrototypoCanvas
			panel={this.state.panel}
			glyph={this.state.glyph}
			reset={() => { this.resetView() }}
			close={(name) => { this.toggleView(name) }}/>];
		const hasGlyph = this.state.panel.mode.indexOf('glyph') != -1;
		const hasText = this.state.panel.mode.indexOf('text') != -1;

		if (hasText) {
			textAndGlyph.push(<PrototypoText
				fontName={this.props.fontName}
				panel={this.state.panel}
				close={(name) => { this.toggleView(name) }}
				field="text"/>);
		}
		else if (hasGlyph && this.state.panel.shadow) {
			textAndGlyph.push(<div className="shadow-of-the-colossus">{String.fromCharCode(this.state.glyph.selected)}</div>)
		}

		if (this.state.panel.mode.indexOf('word') != -1) {
			word = <PrototypoWord
				fontName={this.props.fontName}
				panel={this.state.panel}
				close={(name) => { this.toggleView(name) }}
				field="word"/>;
		}

		let down;
		if (hasGlyph || hasText) {
			const classes = ClassNames({
				'is-up':!word,
			});
			down = (
				<div id="prototypotextandglyph" className={classes}>
					{textAndGlyph}
				</div>
			);
		}

		let up;
		if (word) {
			up = (
				<div id="prototypoword" className="is-up">
					{word}
				</div>
			);
		}

		return (
			<div id="prototypopanel">
				{up}
				{down}
				<HoverViewMenu mode={this.state.panel.mode} toggleView={(text) => { this.toggleView(text) }}/>
			</div>
		)
	}
}