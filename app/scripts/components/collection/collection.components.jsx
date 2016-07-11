import React from 'react';
import Lifespan from 'lifespan';
import ClassNames from 'classnames';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import LocalClient from '~/stores/local-client.stores.jsx';

import Button from '../shared/button.components.jsx';

export default class Collection extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			families: [],
		};
		this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);

		//function binding
		this.returnToDashboard = this.returnToDashboard.bind(this);
		this.open = this.open.bind(this);
		this.openFamilyModal = this.openFamilyModal.bind(this);
		this.selectFamily = this.selectFamily.bind(this);
		this.openVariantModal = this.openVariantModal.bind(this);
	}

	async componentWillMount() {
		this.client = LocalClient.instance();
		this.lifespan = new Lifespan();

		const {head} = await this.client.fetch('/prototypoStore');

		this.setState({
			templateInfos: head.toJS().templateList,
		});

		this.client.getStore('/prototypoStore', this.lifespan)
			.onUpdate(({head}) => {
				this.setState({
					families: head.toJS().fonts,
					selected: head.toJS().collectionSelectedFamily || {},
					selectedVariant: head.toJS().collectionSelectedVariant || {},
					familyDeleteSplit: head.toJS().uiFamilyDeleteSplit,
					variantDeleteSplit: head.toJS().uiVariantDeleteSplit,
				});
			})
			.onDelete(() => {
				this.setState({
					families: undefined,
				});
			});
	}

	componentWillUnmount() {
		this.lifespan.release();
	}

	returnToDashboard() {
		this.client.dispatchAction('/store-value', {uiShowCollection: false});
	}

	open() {
		this.client.dispatchAction('/select-variant', {variant: this.state.selectedVariant, family: this.state.selected});
		this.client.dispatchAction('/store-value', {uiShowCollection: false});
	}

	download() {
	}

	render() {
		const selectedFamilyVariants = (_.find(this.state.families, (family) => {
			return family.name === this.state.selected.name;
		}) || {}).variants;
		const variant = selectedFamilyVariants
			? <VariantList
				variants={selectedFamilyVariants}
				selectedVariantId={this.state.selectedVariant.id}
				key={this.state.selected.name}
				deleteSplit={this.state.familyDeleteSplit}
				family={this.state.selected}/>
			: false;

		const selectedVariant = (_.find(selectedFamilyVariants, (item) => {
			return item.id === this.state.selectedVariant.id;
		}) || {});

		const variantInfo = <VariantInfo
			open={this.open}
			download={this.download}
			key={selectedVariant.id}
			deleteSplit={this.state.variantDeleteSplit}
			family={this.state.selected}
			variant={selectedVariant}/>;

		return (
			<div className="collection">
				<div className="collection-container">
					<div className="account-dashboard-icon"/>
					<div className="account-dashboard-home-icon" onClick={this.returnToDashboard}/>
					<div className="account-header">
						<h1 className="account-title">My collection</h1>
					</div>
					<div className="collection-content">
						<FamilyList list={this.state.families} templateInfos={this.state.templateInfos} selected={this.state.selected}/>
						<ReactCSSTransitionGroup
							component="div"
							transitionName="variant-list-container"
							transitionEnterTimeout={300}
							transitionLeaveTimeout={300}
							className="variant-list collection-pan">
							{variant}
						</ReactCSSTransitionGroup>
						<ReactCSSTransitionGroup
							component="div"
							transitionName="variant-info-container"
							transitionEnterTimeout={300}
							transitionLeaveTimeout={300}
							className="variant-info collection-pan">
							{variantInfo}
						</ReactCSSTransitionGroup>
					</div>
				</div>
			</div>
		);
	}
}


class FamilyList extends React.Component {
	constructor(props) {
		super(props);
		this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
	}

	componentWillMount() {
		this.client = LocalClient.instance();
	}

	openFamilyModal() {
		this.client.dispatchAction('/store-value', {openFamilyModal: true});
	}

	render() {
		const families = _.map(this.props.list, (family) => {
			const templateInfo = _.find(this.props.templateInfos, (template) => {
				return template.templateName === family.template;
			});

			const selected = family.name === this.props.selected.name;

			return <Family
				key={family.name}
				family={family}
				selected={selected}
				class={family.template.split('.')[0]}
				templateName={templateInfo.name}/>;
		});

		return (
				<div className="family-list collection-pan">
					<Button label="Create a new family" click={this.openFamilyModal}/>
					{families}
				</div>
		);
	}
}

class Family extends React.Component {
	constructor(props) {
		super(props);
		this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
	}

	componentWillMount() {
		this.client = LocalClient.instance();
	}

	selectFamily() {
		this.client.dispatchAction('/select-family-collection', this.props.family);
	}

	render() {
		const classes = ClassNames({
			family: true,
			'is-active': this.props.selected,
		});
		const sampleClasses = ClassNames({
			'family-sample': true,
			[this.props.class]: true,
		});

		return (
			<div className={classes} onClick={this.selectFamily}>
				<div className={sampleClasses}></div>
				<div className="family-info">
					<div className="family-info-name">
						{this.props.family.name}
					</div>
					<div className="family-info-base">
						FROM<span className="family-info-base-template"> {this.props.templateName}</span>
					</div>
				</div>
			</div>
		);
	}
}

class VariantList extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);

		// function binging in order to avoid unnecessary re-render
		this.cancelDelete = this.cancelDelete.bind(this);
		this.prepareDeleteOrDelete = this.prepareDeleteOrDelete.bind(this);
		this.openChangeNameFamily = this.openChangeNameFamily.bind(this);
	}

	componentWillMount() {
		this.client = LocalClient.instance();
	}

	selectVariant(variant) {
		this.client.dispatchAction('/select-variant-collection', variant);
	}

	openVariantModal() {
		this.client.dispatchAction('/store-value', {
			openVariantModal: true,
			familySelectedVariantCreation: this.props.family,
		});
	}

	openChangeNameFamily() {
		this.client.dispatchAction('/store-value', {
			openChangeFamilyNameModal: true,
			familySelectedVariantCreation: this.props.family,
		});
	}

	prepareDeleteOrDelete() {
		if (this.props.deleteSplit) {
			this.client.dispatchAction('/delete-family', {
				family: this.props.family,
			});
			this.client.dispatchAction('/store-value', {
				uiFamilyDeleteSplit: false,
			});
		}
		else {
			this.client.dispatchAction('/store-value', {
				uiFamilyDeleteSplit: true,
			});
		}
	}

	cancelDelete() {
		this.client.dispatchAction('/store-value', {
			uiFamilyDeleteSplit: false,
		});
	}

	render() {
		const variants = _.map(this.props.variants, (variant, i) => {
			const classes = ClassNames({
				'variant-list-name': true,
				'is-active': variant.id === this.props.selectedVariantId,
			});

			return (
				<div className={classes} key={i} onClick={() => {this.selectVariant(variant);}}>
					{variant.name}
				</div>
			);
		});

		return (
			<div className="variant-list-container">
				<div className="variant-list-title">
					FAMILY ACTIONS
				</div>
				<Button label="Download family"/>
				<Button label="Change family name" click={this.openChangeNameFamily}/>
				<Button
					label={this.props.deleteSplit ? 'Delete' : 'Delete family'}
					altLabel="Cancel"
					danger={true}
					splitButton={true}
					splitted={this.props.deleteSplit}
					click={this.prepareDeleteOrDelete}
					altClick={this.cancelDelete}
				/>
				<div className="variant-list-title">
					VARIANTS
				</div>
				<Button label="Add variant" click={this.openVariantModal}/>
				{variants}
			</div>
		);
	}
}

class VariantInfo extends React.Component {
	constructor(props) {
		super(props);
		this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
		this.edit = this.edit.bind(this);
		this.duplicate = this.duplicate.bind(this);
		this.cancelDelete = this.cancelDelete.bind(this);
		this.prepareDeleteOrDelete = this.prepareDeleteOrDelete.bind(this);
	}

	componentWillMount() {
		this.client = LocalClient.instance();
	}

	edit() {
		this.client.dispatchAction('/store-value', {
			openChangeVariantNameModal: true,
			familySelectedVariantCreation: this.props.family,
		});
	}

	duplicate() {
		this.client.dispatchAction('/store-value', {
			openDuplicateVariantModal: true,
			familySelectedVariantCreation: this.props.family,
		});
	}

	prepareDeleteOrDelete() {
		if (this.props.deleteSplit) {
			this.client.dispatchAction('/delete-variant', {
				variant: this.props.variant,
				familyName: this.props.family.name,
			});
			this.client.dispatchAction('/store-value', {
				uiVariantDeleteSplit: false,
			});
		}
		else {
			this.client.dispatchAction('/store-value', {
				uiVariantDeleteSplit: true,
			});
		}
	}

	cancelDelete() {
		this.client.dispatchAction('/store-value', {
			uiVariantDeleteSplit: false,
		});
	}

	render() {
		const result = this.props.variant.id
			? (
				<div className="variant-info-container">
					<div className="variant-list-title">
						VARIANT ACTIONS
					</div>
					<Button label="Open in prototypo" click={this.props.open}/>
					<Button label="Download variant" click={this.props.download}/>
					<Button label="Change variant name" click={this.edit}/>
					<Button label="Duplicate variant" click={this.duplicate}/>
					<Button
						label={this.props.deleteSplit ? 'Delete' : 'Delete variant'}
						altLabel="Cancel"
						danger={true}
						splitButton={true}
						splitted={this.props.deleteSplit}
						click={this.prepareDeleteOrDelete}
						altClick={this.cancelDelete}
					/>
				</div>
			)
			: (
				<div className="variant-info-container">
				</div>
			);

		return result;
	}
}
