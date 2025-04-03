{
    'name': 'Odoo ChatBot Connector',
    'version': '18.0.0.0.0',
    'category': 'Extra Tools',
    'summary': 'ChatGPT Integration',
    'description': """Allows the application to leverage the capabilities of 
    the GPT language model to generate human-like responses,Odoo ChatGPT 
    Connector,Odoo ChatGPT,ChatGPT, chatgpt odoo connector, chatgpt""",
    'author': 'BrainBrick',
    'company': 'BrainBrick',
    'maintainer': 'BrainBrick',
    'website': 'https://brainbrick.net/',
    'depends': ['website'],
    'data': [
        'security/security.xml',
        'security/ir.model.access.csv',
        # 'views/odoo_chatgpt_connector_menus.xml',
        'views/res_config_setting_views.xml',
        'views/website_templates.xml',
        'views/ai_chat_history.xml',
        'views/menus.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'odoo_chatgpt_connector/static/src/js/submit_request.js',
            'odoo_chatgpt_connector/static/src/css/container.css'
        ],
    },
    'images': ['static/description/banner.jpg'],
    'license': 'AGPL-3',
    'installable': True,
    'application': False,
    'auto_install': False,
}
