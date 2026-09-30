"""
Train the leaf disease classifier via transfer learning.

Usage:
    python train_model.py --data_dir ./dataset/tomato --output_dir ./ml --epochs 20

Expected dataset layout (standard Keras ImageDataGenerator directory format):
    dataset/tomato/
        Early_Blight/
            img1.jpg ...
        Late_Blight/
            img1.jpg ...
        Leaf_Spot/
            img1.jpg ...
        Healthy/
            img1.jpg ...

Produces:
    ml/trained_model.h5      -- the trained Keras model, picked up automatically
                                 by app/services/detection.py via MODEL_PATH
    ml/class_names.json      -- ordered list of class names matching model output indices
"""
import argparse
import json
import os
import tensorflow as tf


def build_model(num_classes: int, base_arch: str = "mobilenetv2"):
    if base_arch == "resnet50":
        base = tf.keras.applications.ResNet50(input_shape=(224, 224, 3), include_top=False, weights="imagenet")
    elif base_arch == "efficientnetb0":
        base = tf.keras.applications.EfficientNetB0(input_shape=(224, 224, 3), include_top=False, weights="imagenet")
    else:
        base = tf.keras.applications.MobileNetV2(input_shape=(224, 224, 3), include_top=False, weights="imagenet")

    base.trainable = False
    model = tf.keras.Sequential([
        base,
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(num_classes, activation="softmax"),
    ])
    return model, base


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True, help="Directory of class-labeled leaf image folders")
    parser.add_argument("--output_dir", default="./ml")
    parser.add_argument("--arch", default="mobilenetv2", choices=["mobilenetv2", "resnet50", "efficientnetb0"])
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--fine_tune_epochs", type=int, default=10)
    parser.add_argument("--batch_size", type=int, default=32)
    args = parser.parse_args()

    datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=30,
        horizontal_flip=True,
        vertical_flip=True,
        brightness_range=[0.7, 1.3],
        validation_split=0.15,
    )
    train_data = datagen.flow_from_directory(
        args.data_dir, target_size=(224, 224), batch_size=args.batch_size, subset="training"
    )
    val_data = datagen.flow_from_directory(
        args.data_dir, target_size=(224, 224), batch_size=args.batch_size, subset="validation"
    )

    class_names = [None] * len(train_data.class_indices)
    for name, idx in train_data.class_indices.items():
        class_names[idx] = name.replace("_", " ")

    model, base = build_model(len(class_names), args.arch)

    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
                  loss="categorical_crossentropy", metrics=["accuracy"])
    early_stop = tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)

    print("Stage 1: training classification head...")
    model.fit(train_data, validation_data=val_data, epochs=args.epochs, callbacks=[early_stop])

    print("Stage 2: fine-tuning top layers...")
    base.trainable = True
    for layer in base.layers[:-20]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5),
                  loss="categorical_crossentropy", metrics=["accuracy"])
    model.fit(train_data, validation_data=val_data, epochs=args.fine_tune_epochs, callbacks=[early_stop])

    val_loss, val_acc = model.evaluate(val_data)
    print(f"Final validation accuracy: {val_acc * 100:.2f}%")

    os.makedirs(args.output_dir, exist_ok=True)
    model.save(os.path.join(args.output_dir, "trained_model.h5"))
    with open(os.path.join(args.output_dir, "class_names.json"), "w") as f:
        json.dump(class_names, f, indent=2)

    print(f"Saved model to {args.output_dir}/trained_model.h5")
    print(f"Saved class names to {args.output_dir}/class_names.json")
    print("Set MODEL_PATH and CLASS_NAMES_PATH in your .env to point at these files.")


if __name__ == "__main__":
    main()
