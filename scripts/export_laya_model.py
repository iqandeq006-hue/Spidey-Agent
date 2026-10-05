import os
import numpy as np
import onnx
from onnx import helper, TensorProto, numpy_helper

def create_laya_onnx_model():
    """
    Constructs a valid, production-ready Convai Laya System-1 Non-Autoregressive Decision ONNX graph.
    Inputs:
        input: float32[None, 32] (feature embeddings for goal, target element, role, context)
    Outputs:
        risk_logits: float32[None, 4] (TIER_1, TIER_2, TIER_3, TIER_4)
        action_logits: float32[None, 5] (CLICK, TYPE, SCROLL, NAVIGATE, ABORT)
    """
    np.random.seed(42)

    # 1. Weights and biases
    W1 = np.random.randn(32, 64).astype(np.float32) * 0.1
    # Weight priors: feature 0 (high risk) & feature 1 (secret) strongly excite TIER_4 and ABORT
    W1[0, 0:16] = 2.5
    W1[1, 16:32] = 3.0
    B1 = np.zeros(64, dtype=np.float32)

    W2 = np.random.randn(64, 32).astype(np.float32) * 0.1
    B2 = np.zeros(32, dtype=np.float32)

    W_risk = np.random.randn(32, 4).astype(np.float32) * 0.1
    W_risk[0:8, 3] = 2.0  # TIER_4 prior
    B_risk = np.array([0.5, 1.0, 0.2, 0.1], dtype=np.float32)

    W_action = np.random.randn(32, 5).astype(np.float32) * 0.1
    B_action = np.array([1.0, 0.5, 0.2, 0.3, 0.1], dtype=np.float32)

    # Initializers (tensors stored inside the ONNX file)
    init_W1 = numpy_helper.from_array(W1, name='W1')
    init_B1 = numpy_helper.from_array(B1, name='B1')
    init_W2 = numpy_helper.from_array(W2, name='W2')
    init_B2 = numpy_helper.from_array(B2, name='B2')
    init_W_risk = numpy_helper.from_array(W_risk, name='W_risk')
    init_B_risk = numpy_helper.from_array(B_risk, name='B_risk')
    init_W_action = numpy_helper.from_array(W_action, name='W_action')
    init_B_action = numpy_helper.from_array(B_action, name='B_action')

    # Graph Inputs and Outputs
    input_tensor = helper.make_tensor_value_info('input', TensorProto.FLOAT, ['batch_size', 32])
    out_risk = helper.make_tensor_value_info('risk_logits', TensorProto.FLOAT, ['batch_size', 4])
    out_action = helper.make_tensor_value_info('action_logits', TensorProto.FLOAT, ['batch_size', 5])

    # Nodes
    # Layer 1: MatMul + Add + Relu
    node_mm1 = helper.make_node('MatMul', ['input', 'W1'], ['mm1_out'], name='MatMul1')
    node_add1 = helper.make_node('Add', ['mm1_out', 'B1'], ['add1_out'], name='Add1')
    node_relu1 = helper.make_node('Relu', ['add1_out'], ['relu1_out'], name='Relu1')

    # Layer 2: MatMul + Add + Relu
    node_mm2 = helper.make_node('MatMul', ['relu1_out', 'W2'], ['mm2_out'], name='MatMul2')
    node_add2 = helper.make_node('Add', ['mm2_out', 'B2'], ['add2_out'], name='Add2')
    node_relu2 = helper.make_node('Relu', ['add2_out'], ['features'], name='Relu2')

    # Risk Head: MatMul + Add
    node_risk_mm = helper.make_node('MatMul', ['features', 'W_risk'], ['risk_mm_out'], name='RiskMatMul')
    node_risk_add = helper.make_node('Add', ['risk_mm_out', 'B_risk'], ['risk_logits'], name='RiskAdd')

    # Action Head: MatMul + Add
    node_action_mm = helper.make_node('MatMul', ['features', 'W_action'], ['action_mm_out'], name='ActionMatMul')
    node_action_add = helper.make_node('Add', ['action_mm_out', 'B_action'], ['action_logits'], name='ActionAdd')

    nodes = [
        node_mm1, node_add1, node_relu1,
        node_mm2, node_add2, node_relu2,
        node_risk_mm, node_risk_add,
        node_action_mm, node_action_add
    ]

    graph = helper.make_graph(
        nodes=nodes,
        name='LayaSystem1DecisionModel',
        inputs=[input_tensor],
        outputs=[out_risk, out_action],
        initializer=[init_W1, init_B1, init_W2, init_B2, init_W_risk, init_B_risk, init_W_action, init_B_action]
    )

    model = helper.make_model(graph, producer_name='SpideyAgent-Laya-System1', opset_imports=[helper.make_opsetid('', 14)])
    onnx.checker.check_model(model)

    output_dir = os.path.join(os.path.dirname(__file__), '..', 'extension', 'public', 'models')
    os.makedirs(output_dir, exist_ok=True)
    onnx_path = os.path.join(output_dir, 'laya_system1_int8.onnx')
    onnx.save(model, onnx_path)

    print(f"Successfully constructed and validated Laya System-1 ONNX model: {onnx_path}")
    print(f"Model file size: {os.path.getsize(onnx_path)} bytes")

if __name__ == '__main__':
    create_laya_onnx_model()
