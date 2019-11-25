import Neo4j from 'neo4j-driver';


export default class Neo4jE {
	_nodes = {};
	_edges = {};
	_groups = {};

	instance = {};


	hide_nodes = {};
	show_nodes = {};


	defaults = {
		neo4jUri: 'bolt://localhost:7687',
		neo4jUser: 'neo4j',
		neo4jPassword: 'neo4j',
		encrypted: 'ENCRYPTION_OFF',
		trust: 'TRUST_ALL_CERTIFICATES',
		initialQuery: 'MATCH (n)-[r]->(m) RETURN * limit 200',
		domId: 'echarts'
	};


	constructor(config) {
		this._init(config);
	}

	_init(config) {
		var defaults = this.defaults;
		this._config = config;
		this._encrypted = config.encrypted || defaults.encrypted;
		this._trust = config.trust || defaults.trust;
		this._driver = Neo4j.driver(
			config.server_url || defaults.neo4jUri,
			Neo4j.auth.basic(config.server_user || defaults.neo4jUser, config.server_password || defaults.neo4jPassword),
			{
				encrypted: this._encrypted,
				trust: this._trust
			}
		);

		this._initEcharts();
	}

	dispose = () => {
		this.instance.dispose();
	};

	_fold = (id) => {
		//隐藏
		if (this.hide_nodes[id]) return;
		//隐藏节点
		// this._consoleLog('藏了节点');
		// this._consoleLog(this._nodes[id]);
		//加入隐藏队列
		this.hide_nodes[id] = this._nodes[id];
		delete this.show_nodes[id];
		var node = this._nodes[id];
		if (node.sub_node_ids) {
			Object.values(node.sub_node_ids).forEach(sub_node_id => this._fold(sub_node_id));
		}
	};


	_option = {
		animation: true,
		title: {
			text: 'Les Miserables',
			subtext: 'Default layout',
			top: 'bottom',
			left: 'right'
		},
		tooltip: {
			trigger: 'item',

		},
		legend: [],
		series: [
			{
				focusNodeAdjacency: true,
				edgeSymbol: ['circle', 'arrow'],
				symbolSize: 55,
				name: 'Les Miserables',
				type: 'graph',
				// layout: 'circular',
				layout: 'force',
				data: [],
				edges: [],
				categories: [],
				roam: true,
				itemStyle: {
					normal: {
						borderColor: '#fff',
						borderWidth: 1,
						shadowBlur: 10,
						shadowColor: 'rgba(0, 0, 0, 0.3)'
					}
				},
				// animation: false,
				force: { // 力引导图基本配置
					initLayout: 'circular',//力引导的初始化布局，默认使用xy轴的标点
					layoutAnimation: true,
					repulsion: 1000,
					gravity: 0,
					edgeLength: [30, 10000]
				},
				circular: {
					rotateLabel: true
				},
				draggable: true,
				label: {
					show: true,
					position: 'inside',
					textStyle: { // 标签的字体样式
						// 'oblique' 倾斜
						fontWeight: 'bold', // 'normal'标准'bold'粗的'bolder'更粗的'lighter'更细的或100
						// | 200 | 300 | 400...
						fontSize: 12 // 字体大小
					}
				},
				edgeLabel: {
					show: true,
					position: 'middle',
					formatter: p => p.data.label
				},
				lineStyle: {
					color: 'source',
					curveness: 0.3,
				},
				tooltip: {
					formatter: p => {
						return p.data.title;
					}
				}
			}
		]
	};

	_initEcharts() {
		this._consoleLog(this._config.id || this.defaults.domId);
		var graph = this.instance = this._config.instance;
		// this._consoleLog(document.getElementById(this._config.id || this.defaults.domId), 'error');
		// var graph = this.instance = echarts.init(document.getElementById(this._config.id || this.defaults.domId));
		graph.setOption(this._config.option || this._option);

		graph.on('click', (params) => {
			if (params.dataType === 'node') {
				this._consoleLog(params);

				var sub_node_ids = params.data.sub_node_ids;

				if (sub_node_ids) { //有子节点
					this.showL();
					var op = this.instance.getOption();

					var should_expand_childs = [];
					var hide_node_count = 0;

					this._consoleLog(this.hide_nodes);

					Object.values(sub_node_ids).forEach(sub_node_id => {
						//只有当当前点击节点的所有节点都在隐藏列表中才需要显示
						var hide_node = this.hide_nodes[sub_node_id];
						if (hide_node) {
							//子节点存在隐藏列表中 + 1
							hide_node_count++;
							should_expand_childs.push(hide_node);
						}
					});


					if (hide_node_count > 0) {
						this._consoleLog('需要展开的节点');
						this._consoleLog(should_expand_childs);
						var data = op.series[0].data;
						//只要有一个子节点被隐藏了就该把该节点下的子节点先全部显示
						should_expand_childs.forEach(should_expand_child => {
							this._consoleLog(`expand ${should_expand_child.name}`);
							var should_expand_child_id = should_expand_child.id;
							this.show_nodes[should_expand_child_id] = should_expand_child;
							data.push(should_expand_child);
							//从隐藏队列中移除
							delete this.hide_nodes[should_expand_child_id];
						});
					} else {
						this._consoleLog('需要隐藏的节点');
						this._consoleLog(sub_node_ids);

						Object.values(sub_node_ids).forEach(sub_node_id => {
							this._fold(sub_node_id);
						});
						op.series[0].data = Object.values(this.show_nodes);
					}

					graph.setOption(op);
					this.hideL();
				}
			}
		});

	}

	_clear() {
		this._consoleLog('开始清理');
		this.hide_nodes = {};
		this.show_nodes = {};
		this._nodes = {};
		this._edges = {};
		this._groups = {};
		this._consoleLog('清理完毕');
	}

	_addNode(node) {
		this._nodes[node.id] = node;
		node.group && (this._groups[node.group] = {name: node.group});
	}

	_addEdge(edge) {
		this._edges[edge.id] = edge;
	}

	/**
	 * Build node object for vis from a neo4j Node
	 * FIXME: use config
	 * FIXME: move to private api
	 * @param neo4jNode
	 * @returns {{}}
	 */
	async buildNodeVisObject(neo4jNode) {
		let node = {};
		let label = neo4jNode.labels[0];

		let labelConfig = this._config && this._config.labels && this._config.labels[label];

		const captionKey = labelConfig && labelConfig['caption'];
		const sizeKey = labelConfig && labelConfig['size'];
		const sizeCypher = labelConfig && labelConfig['sizeCypher'];
		const communityKey = labelConfig && labelConfig['community'];

		node.id = neo4jNode.identity.toInt();

		// node size

		if (sizeCypher) {
			// use a cypher statement to determine the size of the node
			// the cypher statement will be passed a parameter {id} with the value
			// of the internal node id

			let session = this._driver.session();
			const result = await session.run(sizeCypher, {id: Neo4j.int(node.id)});
			for (let record of result.records) {
				record.forEach((v) => {
					if (typeof v === 'number') {
						node.value = v;
					} else if (Neo4j.isInt(v)) {
						node.value = v.toNumber();
					}
				});
			}
		} else if (typeof sizeKey === 'number') {
			node.value = sizeKey;
		} else {
			let sizeProp = neo4jNode.properties[sizeKey];

			if (sizeProp && typeof sizeProp === 'number') {
				// property value is a number, OK to use
				node.value = sizeProp;
			} else if (sizeProp && typeof sizeProp === 'object' && Neo4j.isInt(sizeProp)) {
				// property value might be a Neo4j Integer, check if we can call toNumber on it:
				if (sizeProp.inSafeRange()) {
					node.value = sizeProp.toNumber();
				} else {
					// couldn't convert to Number, use default
					node.value = 1.0;
				}
			} else {
				node.value = 1.0;
			}
		}

		// node caption
		if (typeof captionKey === 'function') {
			node.label = captionKey(neo4jNode);
		} else {
			node.label = neo4jNode.properties[captionKey] || label || '';
		}

		// community
		// behavior: color by value of community property (if set in config), then color by label
		if (!communityKey) {
			node.group = label;
		} else {
			try {
				if (neo4jNode.properties[communityKey]) {
					node.group = neo4jNode.properties[communityKey].toNumber() || label || 0;  // FIXME: cast to Integer

				} else {
					node.group = 0;
				}

			} catch (e) {
				node.group = 0;
			}
		}
		// set all properties as tooltip
		node.title = '';
		for (let key in neo4jNode.properties) {
			if (neo4jNode.properties.hasOwnProperty(key)) {
				node.title += `<strong>${key}:</strong> ${neo4jNode.properties[key]}<br>`;
			}
		}
		return node;
	}

	/**
	 * Build edge object for vis from a neo4j Relationship
	 * @param r
	 * @returns {{}}
	 */
	buildEdgeVisObject(r) {
		const nodeTypeConfig = this._config && this._config.relationships && this._config.relationships[r.type];
		let weightKey = nodeTypeConfig && nodeTypeConfig.thickness,
			captionKey = nodeTypeConfig && nodeTypeConfig.caption;

		let edge = {};
		edge.id = r.identity.toInt();
		edge.from = r.start.toInt();
		edge.to = r.end.toInt();

		edge.source = r.start.toString();
		edge.target = r.end.toString();

		// hover tooltip. show all properties in the format <strong>key:</strong> value
		edge.title = '';
		for (let key in r.properties) {
			if (r.properties.hasOwnProperty(key)) {
				edge['title'] += `<strong>${key}:</strong> ${r.properties[key]}<br>`;
			}
		}

		// set relationship thickness
		if (weightKey && typeof weightKey === 'string') {
			edge.value = r.properties[weightKey];
		} else if (weightKey && typeof weightKey === 'number') {
			edge.value = weightKey;
		} else {
			edge.value = 1.0;
		}

		if (typeof captionKey === 'boolean') {
			if (!captionKey) {
				edge.label = '';
			} else {
				edge.label = r.type;
			}
		} else if (captionKey && typeof captionKey === 'string') {
			edge.label = r.properties[captionKey] || '';
		} else {
			edge.label = r.type;
		}

		return edge;
	}

	_consoleLog(message, level = 'log') {
		if (level !== 'log' || this._config.console_debug) {
			// eslint-disable-next-line no-console
			console[level](message);
		}
	}

	hideL() {
		this.instance.hideLoading();
	}

	showL() {
		this.instance.showLoading({
			text: '数据获取中',
			effect: 'whirling'
		});
	}

	query(cql) {
		// eslint-disable-next-line no-unused-vars
		let recordCount = 0;
		let session = this._driver.session();
		const dataBuildPromises = [];
		session
			.run(cql, {limit: 30})
			.subscribe({
				onNext: (record) => {
					recordCount++;
					const dataPromises = Object.values(record.toObject()).map(async (v) => {
						if (v instanceof Neo4j.types.Node) {
							let node = await this.buildNodeVisObject(v);
							try {
								this._addNode(node);
							} catch (e) {
								this._consoleLog(e, 'error');
							}
						} else if (v instanceof Neo4j.types.Relationship) {
							let edge = this.buildEdgeVisObject(v);
							this._addEdge(edge);

						} else if (v instanceof Neo4j.types.Path) {
							let startNode = await this.buildNodeVisObject(v.start);
							let endNode = await this.buildNodeVisObject(v.end);

							this._addNode(startNode);
							this._addNode(endNode);

							for (let obj of v.segments) {
								this._addNode(await this.buildNodeVisObject(obj.start));
								this._addNode(await this.buildNodeVisObject(obj.end));
								this._addEdge(this.buildEdgeVisObject(obj.relationship));
							}

						} else if (v instanceof Array) {
							for (let obj of v) {
								if (obj instanceof Neo4j.types.Node) {
									let node = await this.buildNodeVisObject(obj);
									this._addNode(node);

								} else if (obj instanceof Neo4j.types.Relationship) {
									let edge = this.buildEdgeVisObject(obj);

									this._addEdge(edge);
								}
							}
						}
					});
					dataBuildPromises.push(Promise.all(dataPromises));
				},
				onCompleted: async () => {
					await Promise.all(dataBuildPromises);
					session.close();
					this._consoleLog('开始处理数据');
					var show_nodes = this.show_nodes;
					var hide_nodes = this.hide_nodes;
					var map_nodes = this._nodes;
					var map_edges = this._edges;

					//寄存子节点至父节点
					for (var i in map_edges) {
						var edge = map_edges[i];
						var source = map_nodes[edge.source];
						var target = map_nodes[edge.target];

						var sub_node_ids = source.sub_node_ids;
						if (!sub_node_ids) {
							sub_node_ids = source.sub_node_ids = {};
						}
						sub_node_ids[target.id] = target.id;
					}

					var edges = Object.values(map_edges).map(edge => ({
						target: edge.target,
						source: edge.source,
						label: edge.label
					}));

					var groups = Object.values(this._groups);

					var all_target = edges.map(edge => edge.target);

					for (var j in map_nodes) {
						var node = map_nodes[j];
						//转换为echarts数据
						node.name = node.label;
						node.value = node.id;
						if (node.group) {
							node.category = groups.findIndex(group => group.name === node.group);
						}
						if (!all_target.includes(node.id.toString())) {
							show_nodes[node.id] = node;
						} else {
							hide_nodes[node.id] = node;
						}
					}
					this._consoleLog(show_nodes);
					this._consoleLog(this.show_nodes);

					var op = this.instance.getOption();

					op.legend = [{
						data: groups.map(function (a) {
							return a.name;
						})
					}];

					var n = Object.values(show_nodes);

					op.series[0].data = n;
					op.series[0].edges = edges;
					op.series[0].categories = groups;
					this._consoleLog('数据梳理完成');
					this._consoleLog(op);

					//
					// //设置子节点数目
					// var count = nodes => {
					// 	nodes.forEach(node => {
					// 		node.c = 0;
					// 		if (node.sub_node_ids) {
					// 			//获取子节点数目并设置
					// 			return node.c += count(node.sub_node_ids);
					// 		}
					// 	});
					// };
					//
					// count(n);


					this.instance.setOption(op);
					this.hideL();
				},
				onError: (error) => {
					this._consoleLog(error, 'error');
				}
			});
	}

	render(cql) {
		this._consoleLog('开始查询');
		this._clear();
		this.showL();
		this.query(cql);
	}

}